# Cortex Monetization Architecture Proposal

**Date:** 2026-02-05
**Scope:** Cortex voice agent (app3) — billing, access control, and revenue infrastructure
**Status:** Proposal / Pre-implementation

---

## Table of Contents

1. [Current State Assessment](#1-current-state-assessment)
2. [Critical Security Issue](#2-critical-security-issue)
3. [Billing Model Design](#3-billing-model-design)
4. [Technical Architecture](#4-technical-architecture)
5. [Data Model](#5-data-model)
6. [Middleware Design](#6-middleware-design)
7. [Stripe Integration](#7-stripe-integration)
8. [Client-Side Changes](#8-client-side-changes)
9. [Implementation Order](#9-implementation-order)
10. [Infrastructure Cost Analysis](#10-infrastructure-cost-analysis)
11. [Scaling Considerations](#11-scaling-considerations)
12. [Appendix: Model Cost Reference](#appendix-model-cost-reference)

---

## 1. Current State Assessment

### What exists

| Component | Status | Location |
|---|---|---|
| Multi-provider LLM routing | Working | `pages/api/{openai,claude,gemini}_{response,structured_response}.ts` |
| Firebase Auth | Working | `src/firebase.ts`, `src/firebase_utils.ts` |
| Model registry with pricing | Working | `packages/ts_common/src/apis/cortex/model_registry.ts` |
| `calculateCost(model, inputTokens, outputTokens)` | Working | Same file — returns USD cost from exact provider pricing |
| Token usage in responses | Working | All LLM routes return `usage.input_tokens` / `usage.output_tokens` |
| InsightsClient analytics | Working | Events → `pages/api/insights/batch.ts` → SurrealDB |
| Firestore user data storage | Working | `src/firebase_utils.ts` — flexible doc/collection CRUD |
| Firebase Cloud Functions | Working | `apps/firebase/functions/src/index.ts` — SurrealDB proxy, embeddings |
| Voice system (Tivi) | Working | Browser-native STT/TTS with ONNX VAD |

### What does not exist

- Authentication on any API route
- Rate limiting
- Credit/billing system
- Payment processing
- Usage quotas or access control
- Cost tracking per user

### Architecture summary

```
Browser (Cortex agent)
  → fetch('/api/{provider}_response', { model, input })
  → Vercel serverless function (no auth, no limits, CORS: *)
  → Provider SDK (OpenAI / Anthropic / Google)
  → JSON response with output_text + usage tokens
  → Browser renders response, Tivi speaks it
```

All routes are non-streaming (full request-response). Each route has a 300-second Vercel timeout. The response includes exact token counts from the provider, which means we can calculate precise cost *before* returning to the client.

---

## 2. Critical Security Issue

Every LLM API route is currently **completely unauthenticated** with `Access-Control-Allow-Origin: '*'`.

This means anyone who discovers these endpoints can:

- Drain the project's OpenAI, Anthropic, and Google API keys
- Run arbitrarily expensive model calls (e.g., `gpt-5.2-pro` at $21/$168 per MTok)
- Hold serverless functions open for up to 300 seconds per request

**This must be fixed before or concurrent with any billing work.** Adding auth middleware to these routes is not optional — it is prerequisite infrastructure that the billing system builds on top of.

---

## 3. Billing Model Design

### Why credit-based, not message-based

A "message" to `gpt-5-nano` costs ~$0.0002. A "message" to `gpt-5.2-pro` can cost $1+. Flat message-based pricing forces one of two bad outcomes:

1. **Model gating** — restrict expensive models to higher tiers, creating complex access control rules that frustrate users and require constant tuning as new models are added.
2. **Cross-subsidization** — cheap-model users subsidize expensive-model users, destroying your margin on premium models.

Credit-based pricing solves this: every request costs credits proportional to its actual LLM cost. The model registry's `calculateCost()` function already computes the exact USD cost per request. Credits are a direct function of that cost.

### Credit economics

```
1 credit = $0.01 of LLM provider cost to you
```

When a user sends a message, the system:
1. Calculates the actual token cost via `calculateCost(model, inputTokens, outputTokens)`
2. Converts to credits: `credits = Math.ceil(cost_usd / 0.01)`
3. Deducts from the user's balance

This means:
- A typical `o4-mini` exchange (~2K input, ~1K output tokens) costs ~$0.007 = **1 credit**
- A `claude-sonnet-4-5` exchange (~2K input, ~2K output tokens) costs ~$0.036 = **4 credits**
- A `gpt-5.2-pro` exchange (~2K input, ~2K output tokens) costs ~$0.378 = **38 credits**

Users see exactly what each model costs. They self-optimize. No model gating rules needed.

### Revenue markup

The credit price to users must be higher than your cost. The **markup ratio** directly determines your gross margin:

```
Gross margin % = 1 - (1 / markup)

2x markup → 50% margin
3x markup → 67% margin
5x markup → 80% margin
```

After Stripe's cut (2.9% + $0.30 per transaction), effective margins are ~3-4% lower.

The markup covers: Vercel infrastructure, Firebase, development time, support, and profit margin.

### The constraint

Subscription credits must satisfy this equation or you lose money:

```
max_credits_per_month = subscription_price / (markup × $0.01)
```

For example, a $20/mo Pro plan at 3x markup: `$20 / (3 × $0.01)` = **667 credits**. If you give more than 667, you lose money when users consume their full quota. If you give fewer, your effective markup is higher than 3x.

### Pricing options

Three strategies, each internally consistent. All share the same structure — only the price/quota/margin tradeoff differs.

---

#### Option A: Growth-First

*Cheap entry, tight quotas, credit packs are the revenue engine.*

**Markup: 3x (~64% margin post-Stripe)**

| | Free | Pro | Premium |
|---|---|---|---|
| **Price** | $0/mo | $15/mo | $40/mo |
| **Credits/month** | 50 | 500 | 1,300 |
| **Your max LLM cost** | $0.50 | $5.00 | $13.00 |
| **Margin (if fully used)** | -$0.50 | ~$9.55 (64%) | ~$25.84 (65%) |
| **Typical messages*** | 25-50 | 250-500 | 650-1,300 |
| **Credit rollover** | None | Up to 150 | Up to 400 |

**Credit packs:**

| Pack | Credits | Price | Per-credit cost | Your margin |
|---|---|---|---|---|
| Starter | 200 | $5 | $0.025 | 60% |
| Standard | 700 | $15 | $0.021 | 52% |
| Bulk | 2,000 | $35 | $0.018 | 44% |

**Who this is for:** Consumer product, wide funnel. Free tier is deliberately tight (25-50 messages) to force evaluation quickly. Pro is cheap enough for impulse purchase. Real revenue comes from credit packs when users run out mid-session.

**Risk:** Low subscription revenue per user. If pack purchase rate is low, revenue underperforms. Users may churn rather than buy packs.

---

#### Option B: Balanced

*Moderate pricing, enough credits for regular daily use, packs for power users.*

**Markup: 3x (~63% margin post-Stripe)**

| | Free | Pro | Premium |
|---|---|---|---|
| **Price** | $0/mo | $25/mo | $60/mo |
| **Credits/month** | 75 | 830 | 2,000 |
| **Your max LLM cost** | $0.75 | $8.30 | $20.00 |
| **Margin (if fully used)** | -$0.75 | ~$15.97 (64%) | ~$38.26 (64%) |
| **Typical messages*** | 35-75 | 415-830 | 1,000-2,000 |
| **Credit rollover** | None | Up to 250 | Up to 600 |

**Credit packs:**

| Pack | Credits | Price | Per-credit cost | Your margin |
|---|---|---|---|---|
| Starter | 300 | $8 | $0.027 | 63% |
| Standard | 1,000 | $22 | $0.022 | 55% |
| Bulk | 3,000 | $55 | $0.018 | 44% |

**Who this is for:** Prosumer / professional tool. Pro tier covers moderate daily use (~25-30 mid-tier messages/day). Users only need packs if they have heavy days or use expensive models frequently. Predictable subscription revenue.

**Risk:** $25/mo is a considered purchase — lower conversion than $15. But higher revenue per subscriber and lower churn (users get enough value from the subscription itself).

---

#### Option C: Volume / Competitive

*Lower margin, more generous quotas, maximize user retention and conversion.*

**Markup: 2x (~46% margin post-Stripe)**

| | Free | Pro | Premium |
|---|---|---|---|
| **Price** | $0/mo | $20/mo | $50/mo |
| **Credits/month** | 100 | 1,000 | 2,500 |
| **Your max LLM cost** | $1.00 | $10.00 | $25.00 |
| **Margin (if fully used)** | -$1.00 | ~$9.12 (46%) | ~$23.25 (47%) |
| **Typical messages*** | 50-100 | 500-1,000 | 1,250-2,500 |
| **Credit rollover** | None | Up to 300 | Up to 750 |

**Credit packs:**

| Pack | Credits | Price | Per-credit cost | Your margin |
|---|---|---|---|---|
| Starter | 400 | $7 | $0.018 | 44% |
| Standard | 1,200 | $18 | $0.015 | 33% |
| Bulk | 4,000 | $50 | $0.013 | 23% |

**Who this is for:** Competing against products with generous free tiers (ChatGPT, Claude.ai). The $20 price point is familiar. 1,000 credits is enough that most Pro users rarely run out — reducing churn and support burden. You accept lower margin in exchange for higher conversion and retention.

**Risk:** 46% gross margin is thin for a startup. After operational costs (dev time, support, marketing), net margin could be near zero during growth. Requires volume to be profitable. Credit packs have low margin — if users buy packs instead of upgrading to Premium, unit economics suffer.

---

\* *Typical messages assumes a mix of cheap (1 credit) and mid-tier (2-3 credit) model usage. See Appendix for per-model cost breakdown.*

### Comparing the options

| Metric | A: Growth-First | B: Balanced | C: Volume |
|---|---|---|---|
| Pro price | $15/mo | $25/mo | $20/mo |
| Pro credits | 500 | 830 | 1,000 |
| Gross margin | ~64% | ~64% | ~46% |
| Free tier generosity | Tight (50 cr) | Moderate (75 cr) | Generous (100 cr) |
| Revenue driver | Credit packs | Subscriptions | Subscriptions |
| Conversion friction | Low (cheap) | Medium | Low (familiar price) |
| Revenue per subscriber | Lower | Higher | Medium |
| Break-even users* | ~15 paying | ~10 paying | ~20 paying |

\* *Break-even against ~$200/mo baseline infrastructure (Vercel Pro + domain + misc).*

### Recommendation

**Option B (Balanced)** is the safest starting point for a new product:
- 64% margin gives room for mistakes and unexpected costs
- $25/mo filters for users who actually value the product (lower support burden)
- 830 credits is enough for real daily use — users feel they're getting value
- Credit packs provide upside revenue without being the primary driver
- You can always lower prices later (easy); raising prices after launch is painful

Option A makes sense if your primary goal is rapid user acquisition and you're confident in the pack purchase conversion funnel. Option C makes sense if you're competing directly with free AI chat products and need volume.

**All three options can be implemented with the same technical architecture.** The only differences are configuration values (quota amounts, prices, rollover caps) stored in Stripe products and the `subscriptions` Postgres table.

### Shared design decisions (all options)

- **All models available on all tiers.** Credits handle the cost differential naturally. A free user can burn all their credits on one `gpt-5.2-pro` call — that's their choice, and it costs you at most $1.
- **Free tier is use-it-or-lose-it.** Prevents free users from hoarding credits across months. Paid tiers get limited rollover to reward loyalty.
- **Feature gating on capabilities, not models.** Code execution and BYO key are gated by tier because they have different cost/security profiles, not because of LLM pricing.
- **Credit packs for overage, not auto-charge.** Users must explicitly buy more credits. No surprise bills. Builds trust.
- **Purchased credits never expire.** Legally simpler, better UX, builds trust. Volume discount on larger packs incentivizes bigger purchases.

### BYO API key

Users on Pro/Premium can enter their own provider API keys. When a BYO key is used:
- The request routes through our server (for security — never call providers from the browser)
- The user's key is used instead of ours
- **Zero credits are deducted** for LLM cost
- The user still pays their subscription fee (for platform access, voice, tools, etc.)

This retains power users who would otherwise leave because they have their own API access. They're paying for the platform, not the LLM calls.

---

## 4. Technical Architecture

### System overview

```
┌──────────────────────────────────────────┐
│          CLIENT (Next.js on Vercel)       │
│                                          │
│  Firebase Auth ──→ JWT token             │
│  Cortex Agent  ──→ API calls             │
│  Billing UI    ──→ usage display         │
│  Stripe Checkout──→ payment flow         │
└──────────────────┬───────────────────────┘
                   │
                   │  Authorization: Bearer <firebase-jwt>
                   │  POST /api/llm/{provider}_{type}
                   │
┌──────────────────▼───────────────────────┐
│          VERCEL API ROUTES                │
│                                          │
│  ┌──────────────────────────────────┐    │
│  │  Middleware Stack (per request):  │    │
│  │                                  │    │
│  │  1. CORS (restricted origins)    │    │
│  │  2. verifyFirebaseJWT(req)       │    │
│  │  3. rateLimit(uid) [Upstash]     │    │
│  │  4. preAuthorize(uid, model)     │    │
│  │     └─ Postgres: read balance    │    │
│  │     └─ Estimate cost, hold       │    │
│  │  5. callLLM(provider, params)    │    │
│  │     └─ Use BYO key if present    │    │
│  │  6. settle(uid, actualUsage)     │    │
│  │     └─ Postgres: deduct actual   │    │
│  │     └─ Write usage record        │    │
│  │  7. Return response + headers    │    │
│  │     └─ X-Credits-Remaining       │    │
│  │     └─ X-Credits-Used            │    │
│  └──────────────────────────────────┘    │
│                                          │
│  /api/stripe/webhook ──→ sync events     │
│  /api/billing/*      ──→ usage, balance  │
└──────┬─────────┬─────────┬───────────────┘
       │         │         │
       ▼         ▼         ▼
┌──────────┐ ┌────────┐ ┌───────────┐
│ Supabase │ │Upstash │ │ Firebase  │
│ Postgres │ │ Redis  │ │           │
│          │ │        │ │ Auth      │
│ billing: │ │ rate   │ │ Firestore │
│ -subscr. │ │ limits │ │ (app data │
│ -credits │ │ only   │ │  settings │
│ -usage   │ │        │ │  cache)   │
│ -ledger  │ │        │ │           │
└──────────┘ └────────┘ └───────────┘
       │                       │
       │ (async, non-blocking) │
       ▼                       │
┌──────────┐                   │
│SurrealDB │ ◄─────────────────┘
│ insights │   (analytics only,
│          │    existing system)
└──────────┘
```

### Why this database split

| Database | Used for | Why this one |
|---|---|---|
| **Supabase Postgres** | Billing: subscriptions, credit balances, usage ledger | ACID transactions for financial data. SQL for reporting (`SELECT SUM(cost_usd) ...`). Relational integrity between subscriptions and usage records. Battle-tested for billing at any scale. |
| **Firebase Auth** | User authentication, JWT tokens | Already integrated throughout the app. Firebase JWTs can be verified server-side with Admin SDK in any API route. |
| **Firestore** | App data: chat history, settings, widget configs, embeddings, caching | Already used for this. Good at real-time sync, flexible schemas, per-user document access. Not appropriate for billing (no aggregation, optimistic concurrency). |
| **Upstash Redis** | Rate limiting only | Sub-ms latency for sliding window rate limits. Serverless (no infrastructure). Built for abuse prevention, not billing state. |
| **SurrealDB** | Analytics and insights events | Already storing events here via `insights/batch.ts`. Keep it for analytics. Billing has its own ledger in Postgres. |

### Why not Firestore for billing

Firestore is excellent for app data but wrong for financial records:

1. **No aggregation queries.** Computing "total revenue by tier for Q1" requires reading every usage document and summing client-side. In Postgres: one SQL query.

2. **Optimistic concurrency model.** Firestore transactions retry on contention. For billing, you need: "deduct exactly N credits, fail if insufficient." Postgres does this atomically with `UPDATE ... WHERE credits >= N RETURNING *`.

3. **No relational integrity.** A usage record should reference a valid subscription. Firestore has no foreign keys. In Postgres, a constraint prevents orphaned records.

4. **Audit and dispute resolution.** When a user says "I was charged incorrectly," you need to query their complete usage history with joins against subscription periods. SQL is built for this. Firestore is not.

5. **Cost at scale.** Firestore charges per document read/write. Each billing check is 1 read + 1 write. At 100K requests/day, that's 200K Firestore operations/day just for billing — $0.12/day in reads alone, on top of what you're already using Firestore for. Supabase Postgres handles this on the free tier.

### Why Upstash Redis (rate limiting only)

Rate limiting is a **security** requirement independent of billing:

- Prevents brute-force against auth endpoints
- Caps request frequency per user (even paying users)
- Blocks free-tier abuse (scripted rapid-fire requests)
- Protects against buggy clients that loop

Upstash is the right tool because:
- Atomic `INCR` with TTL = sliding window rate limit in one operation
- Sub-millisecond latency (doesn't add perceptible delay)
- Serverless pricing (pay per command, not per server)
- Native Vercel integration (`@upstash/ratelimit` SDK)

**Upstash is NOT used for billing state.** Credit balances and deductions live in Postgres. The rate limiter just says "this user has made N requests in the last M seconds" — a security gate before the billing check even runs.

---

## 5. Data Model

### Supabase Postgres schema

```sql
-- =============================================
-- SUBSCRIPTIONS
-- =============================================
CREATE TABLE subscriptions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    uid             TEXT NOT NULL UNIQUE,          -- Firebase UID
    tier            TEXT NOT NULL DEFAULT 'free'
                    CHECK (tier IN ('free', 'pro', 'premium')),

    -- Stripe references (null for free tier)
    stripe_customer_id     TEXT,
    stripe_subscription_id TEXT,

    -- Current billing period
    period_start    TIMESTAMPTZ NOT NULL DEFAULT now(),
    period_end      TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '30 days'),

    -- Credits
    monthly_quota       INT NOT NULL DEFAULT 100,   -- from tier
    period_credits_used INT NOT NULL DEFAULT 0,     -- resets each period
    purchased_credits   INT NOT NULL DEFAULT 0,     -- from credit packs, never expire
    rollover_credits    INT NOT NULL DEFAULT 0,     -- from previous period, capped
    rollover_cap        INT NOT NULL DEFAULT 0,     -- max rollover by tier

    -- BYO keys (encrypted with app-level key, not stored in plaintext)
    byo_keys_encrypted  JSONB,

    -- Metadata
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_subscriptions_uid ON subscriptions(uid);
CREATE INDEX idx_subscriptions_stripe_customer ON subscriptions(stripe_customer_id);

-- =============================================
-- USAGE LEDGER
-- =============================================
-- One row per LLM request. This is the audit trail.
CREATE TABLE usage_records (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    uid             TEXT NOT NULL,
    timestamp       TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Request details
    model           TEXT NOT NULL,
    provider        TEXT NOT NULL,
    input_tokens    INT NOT NULL,
    output_tokens   INT NOT NULL,

    -- Cost
    cost_usd        NUMERIC(10, 6) NOT NULL,       -- actual provider cost
    credits_charged INT NOT NULL,                   -- credits deducted

    -- Billing source
    charged_from    TEXT NOT NULL
                    CHECK (charged_from IN ('quota', 'purchased', 'rollover', 'byo_key')),

    -- Session link (to SurrealDB insights)
    session_id      TEXT,

    -- Request metadata
    request_type    TEXT DEFAULT 'unstructured'
                    CHECK (request_type IN ('unstructured', 'structured'))
);

CREATE INDEX idx_usage_uid_timestamp ON usage_records(uid, timestamp DESC);
CREATE INDEX idx_usage_uid_period ON usage_records(uid, timestamp)
    WHERE timestamp > now() - interval '90 days';  -- partial index for recent queries

-- =============================================
-- CREDIT TRANSACTIONS
-- =============================================
-- Tracks all credit movements for reconciliation.
CREATE TABLE credit_transactions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    uid             TEXT NOT NULL,
    timestamp       TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Transaction details
    type            TEXT NOT NULL
                    CHECK (type IN (
                        'subscription_grant',      -- monthly credits from tier
                        'purchase',                -- credit pack purchase
                        'usage_deduction',         -- LLM call deduction
                        'rollover',                -- credits carried from previous period
                        'rollover_expired',        -- credits that exceeded rollover cap
                        'refund',                  -- manual or automatic refund
                        'adjustment'               -- manual admin adjustment
                    )),
    amount          INT NOT NULL,                  -- positive = credit, negative = debit
    balance_after   INT NOT NULL,                  -- balance after this transaction

    -- References
    usage_record_id UUID REFERENCES usage_records(id),
    stripe_payment_intent_id TEXT,
    note            TEXT,

    CONSTRAINT positive_balance CHECK (balance_after >= 0)
);

CREATE INDEX idx_transactions_uid ON credit_transactions(uid, timestamp DESC);

-- =============================================
-- HELPER: Available credits calculation
-- =============================================
-- Total available = (monthly_quota - period_credits_used) + purchased_credits + rollover_credits
CREATE OR REPLACE FUNCTION available_credits(sub subscriptions)
RETURNS INT AS $$
BEGIN
    RETURN GREATEST(sub.monthly_quota - sub.period_credits_used, 0)
         + sub.purchased_credits
         + sub.rollover_credits;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =============================================
-- HELPER: Deduct credits atomically
-- =============================================
-- Deduction priority: monthly quota first, then rollover, then purchased.
-- Returns the updated subscription row, or NULL if insufficient credits.
CREATE OR REPLACE FUNCTION deduct_credits(
    p_uid TEXT,
    p_amount INT
) RETURNS subscriptions AS $$
DECLARE
    sub subscriptions;
    remaining INT;
    from_quota INT;
    from_rollover INT;
    from_purchased INT;
BEGIN
    -- Lock the row
    SELECT * INTO sub FROM subscriptions WHERE uid = p_uid FOR UPDATE;

    IF sub IS NULL THEN
        RETURN NULL;
    END IF;

    -- Check total available
    IF available_credits(sub) < p_amount THEN
        RETURN NULL;  -- Insufficient credits
    END IF;

    remaining := p_amount;

    -- 1. Deduct from monthly quota first
    from_quota := LEAST(remaining, GREATEST(sub.monthly_quota - sub.period_credits_used, 0));
    remaining := remaining - from_quota;

    -- 2. Then from rollover
    from_rollover := LEAST(remaining, sub.rollover_credits);
    remaining := remaining - from_rollover;

    -- 3. Then from purchased
    from_purchased := LEAST(remaining, sub.purchased_credits);
    remaining := remaining - from_purchased;

    -- Apply the deduction
    UPDATE subscriptions SET
        period_credits_used = period_credits_used + from_quota,
        rollover_credits = rollover_credits - from_rollover,
        purchased_credits = purchased_credits - from_purchased,
        updated_at = now()
    WHERE uid = p_uid
    RETURNING * INTO sub;

    RETURN sub;
END;
$$ LANGUAGE plpgsql;
```

### Why this schema

**`subscriptions` table:** One row per user. Contains their current plan state, credit balances, and Stripe references. This is the hot path — read on every request, updated on every deduction. Single-row operations are fast even under load.

**`usage_records` table:** Append-only audit log. One row per LLM request. Never updated, never deleted. This is your source of truth for usage disputes, cost analysis, and revenue reporting. The partial index on recent records keeps queries fast while the full history is preserved.

**`credit_transactions` table:** Double-entry style ledger of all credit movements. Every grant, deduction, purchase, rollover, and refund is recorded with a `balance_after` snapshot. If `subscriptions.purchased_credits` ever disagrees with the sum of transactions, you can reconcile.

**`deduct_credits()` function:** Runs as a Postgres function to guarantee atomicity. The `FOR UPDATE` row lock prevents concurrent requests from double-spending. Deduction priority (quota → rollover → purchased) is enforced server-side, not in application code. Returns NULL on insufficient credits — the API route checks this and returns 402.

---

## 6. Middleware Design

### Current route pattern (no auth)

Every route currently follows this pattern (example from `claude_response.ts`):

```typescript
export default async function handler(req, res) {
    // CORS headers (permissive)
    res.setHeader('Access-Control-Allow-Origin', '*')
    // ... other headers

    // Method check
    if (req.method !== 'POST') return res.status(405)...

    // Input validation
    const { model, input } = req.body
    if (!model || !input) return res.status(400)...

    // Call provider directly
    const response = await client.messages.create({ model, ... })

    // Return response
    res.status(200).json(normalized)
}
```

### Proposed middleware wrapper

Rather than modifying each route individually, create a `withBilling` higher-order function that wraps existing handlers:

```typescript
// lib/middleware/withBilling.ts

import { verifyFirebaseToken } from './auth'
import { checkRateLimit } from './rateLimit'
import { preAuthorize, settle } from './billing'
import { calculateCost } from 'tidyscripts_common/apis/cortex/model_registry'

interface BillingContext {
    uid: string
    model: string
    byoKey?: string          // decrypted BYO key if present
    estimatedCredits: number
}

export function withBilling(
    handler: (req, res, ctx: BillingContext) => Promise<any>
) {
    return async function (req, res) {
        // ── CORS (restricted to known origins) ──
        const origin = req.headers.origin
        const allowed = ['https://tidyscripts.com', 'https://your-domain.vercel.app']
        if (allowed.includes(origin)) {
            res.setHeader('Access-Control-Allow-Origin', origin)
        }
        res.setHeader('Access-Control-Allow-Methods', 'OPTIONS,POST')
        res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type')
        res.setHeader('Access-Control-Allow-Credentials', 'true')

        if (req.method === 'OPTIONS') return res.status(200).end()
        if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

        // ── 1. Authenticate ──
        const auth = await verifyFirebaseToken(req)
        if (!auth) return res.status(401).json({ error: 'Unauthorized' })

        // ── 2. Rate limit ──
        const allowed = await checkRateLimit(auth.uid)
        if (!allowed) return res.status(429).json({
            error: 'Rate limit exceeded',
            retry_after_ms: allowed.retryAfterMs
        })

        // ── 3. Pre-authorize ──
        const { model } = req.body
        const preAuth = await preAuthorize(auth.uid, model)

        if (!preAuth.authorized) {
            return res.status(402).json({
                error: 'Insufficient credits',
                credits_remaining: preAuth.creditsRemaining,
                estimated_cost: preAuth.estimatedCredits,
                upgrade_url: '/settings/billing'
            })
        }

        // ── 4. Call LLM handler ──
        // The handler receives the billing context and returns
        // the response + usage data (not sent to client yet).
        const result = await handler(req, res, {
            uid: auth.uid,
            model,
            byoKey: preAuth.byoKey,
            estimatedCredits: preAuth.estimatedCredits,
        })

        // If handler already sent a response (error), stop
        if (res.headersSent) return

        // ── 5. Settle actual cost ──
        const { usage } = result
        const actualCostUsd = calculateCost(model, usage.input_tokens, usage.output_tokens)
        const actualCredits = Math.ceil(actualCostUsd / 0.01)

        const settlement = await settle(auth.uid, {
            model,
            provider: result.provider,
            inputTokens: usage.input_tokens,
            outputTokens: usage.output_tokens,
            costUsd: actualCostUsd,
            creditsCharged: preAuth.byoKey ? 0 : actualCredits,
            chargedFrom: preAuth.byoKey ? 'byo_key' : preAuth.chargedFrom,
            sessionId: req.body.session_id,
            requestType: req.body.schema ? 'structured' : 'unstructured',
        })

        // ── 6. Respond ──
        res.setHeader('X-Credits-Used', String(settlement.creditsCharged))
        res.setHeader('X-Credits-Remaining', String(settlement.creditsRemaining))
        res.status(200).json(result.response)
    }
}
```

### Wrapped route example

The existing route handler barely changes — it just returns data instead of calling `res.json()` directly:

```typescript
// pages/api/llm/claude_response.ts (refactored)

import { withBilling } from '@/lib/middleware/withBilling'
import Anthropic from '@anthropic-ai/sdk'

export const config = { maxDuration: 300 }

export default withBilling(async (req, res, ctx) => {
    // Use BYO key if available, otherwise server key
    const client = new Anthropic(ctx.byoKey ? { apiKey: ctx.byoKey } : undefined)

    const { model, input, max_tokens = 4096, temperature } = req.body

    if (!model || !input) {
        res.status(400).json({ error: 'model and input are required' })
        return
    }

    const systemMessages = input.filter(m => m.role === 'system')
    const systemContent = systemMessages.map(m => m.content).join('\n\n') || undefined
    const messages = input.filter(m => m.role !== 'system')

    const response = await client.messages.create({
        model,
        max_tokens,
        ...(temperature && { temperature }),
        ...(systemContent && { system: systemContent }),
        messages,
    })

    return {
        provider: 'anthropic',
        usage: {
            input_tokens: response.usage.input_tokens,
            output_tokens: response.usage.output_tokens,
        },
        response: {
            output_text: response.content[0]?.type === 'text' ? response.content[0].text : '',
            usage: response.usage,
            model: response.model,
            finish_reason: response.stop_reason,
        },
    }
})
```

### Pre-authorization: estimate before calling LLM

Since routes are non-streaming, the flow is:

1. **Estimate cost** before the LLM call using the model's `maxOutputTokens` as worst case
2. **Check if user can afford** the estimate
3. **Call LLM** (the expensive part)
4. **Settle to actual cost** using real token counts from the response

We do NOT hold/reserve credits during the LLM call. Instead:
- Pre-auth checks `available_credits(uid) >= estimated_credits` (a read, no write)
- After the LLM call, `deduct_credits(uid, actual_credits)` runs atomically
- If the user's balance dropped between check and deduct (concurrent requests), the Postgres function returns NULL and we return 402

This avoids the complexity of reservation/settlement while still being safe. The worst case is: two concurrent requests both pass pre-auth, one succeeds at deduction, the other gets 402. That's correct behavior.

---

## 7. Stripe Integration

### Components needed

| Stripe feature | Purpose |
|---|---|
| **Checkout Sessions** | Subscription sign-up and credit pack purchases |
| **Billing Portal** | Self-service plan management (upgrade, downgrade, cancel, payment method) |
| **Subscriptions** | Recurring billing for Pro/Premium tiers |
| **One-time Payments** | Credit pack purchases |
| **Webhooks** | Sync Stripe state → Postgres |

### Webhook handler

```
POST /api/stripe/webhook
```

Events to handle:

| Event | Action |
|---|---|
| `checkout.session.completed` | Create/update subscription in Postgres. Grant monthly credits. |
| `invoice.paid` | New billing period: reset `period_credits_used`, calculate rollover, update `period_start`/`period_end`. |
| `customer.subscription.updated` | Tier change: update `tier`, `monthly_quota`, `rollover_cap`. Handle proration. |
| `customer.subscription.deleted` | Downgrade to free tier. Zero out rollover. Keep purchased credits. |
| `payment_intent.succeeded` (one-time) | Credit pack: increment `purchased_credits`. Write credit_transaction. |

**Idempotency:** Store processed Stripe event IDs. Skip duplicates. Webhooks can arrive out of order or be retried.

### Period rollover logic (triggered by `invoice.paid`)

```sql
-- On new period start:
-- 1. Calculate unused credits from expiring period
-- 2. Rollover up to cap, expire the rest
-- 3. Reset period counter
-- 4. Grant new monthly quota

WITH expiring AS (
    SELECT
        uid,
        GREATEST(monthly_quota - period_credits_used, 0) as unused,
        rollover_cap
    FROM subscriptions WHERE uid = $1
)
UPDATE subscriptions SET
    rollover_credits = LEAST(
        (SELECT unused FROM expiring) + rollover_credits,
        (SELECT rollover_cap FROM expiring)
    ),
    period_credits_used = 0,
    period_start = $new_period_start,
    period_end = $new_period_end,
    updated_at = now()
WHERE uid = $1;
```

---

## 8. Client-Side Changes

### Auth token in API calls

Currently, Cortex calls LLM routes without auth headers. The client must include the Firebase JWT:

```typescript
// In the Cortex agent's LLM call function
const token = await firebase.auth().currentUser.getIdToken()

const response = await fetch('/api/llm/claude_response', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ model, input }),
})

// Read billing headers from response
const creditsUsed = response.headers.get('X-Credits-Used')
const creditsRemaining = response.headers.get('X-Credits-Remaining')
```

### Billing UI components needed

1. **Credit balance display** — in TopBar, next to existing context usage indicator. Shows remaining credits and tier badge.

2. **Usage breakdown** — in Settings panel. Shows credits used this period, by model, with cost visualization.

3. **Upgrade modal** — triggered when API returns 402. Shows current plan, upgrade options, and Stripe Checkout button.

4. **Credit pack purchase** — accessible from Settings. Shows pack options, triggers Stripe Checkout for one-time payment.

5. **BYO key management** — in Settings for Pro/Premium users. Input fields for each provider. Keys are encrypted before storage.

### Handling 402 responses

```typescript
if (response.status === 402) {
    const { credits_remaining, estimated_cost, upgrade_url } = await response.json()
    // Show upgrade modal with context:
    // "This request would cost ~{estimated_cost} credits.
    //  You have {credits_remaining} remaining.
    //  Upgrade your plan or buy credits to continue."
}
```

---

## 9. Implementation Order

### Phase 0: Security (prerequisite)

**Add Firebase Auth verification to all LLM API routes.**

This is a standalone change that can ship immediately. No billing logic — just reject unauthenticated requests. Every phase after this depends on auth being in place.

Deliverables:
- `lib/middleware/auth.ts` — Firebase Admin SDK JWT verification
- Update all 7 LLM routes to require auth
- Update client to send `Authorization: Bearer <token>` header
- Restrict CORS to known origins

### Phase 1: Billing infrastructure

Set up the data layer and middleware without Stripe. All users start on "free" tier with a manually provisioned credit balance for testing.

Deliverables:
- Supabase project + Postgres schema (tables, functions, indexes)
- `lib/middleware/withBilling.ts` — the wrapper from Section 6
- `lib/middleware/rateLimit.ts` — Upstash rate limiter
- `lib/billing/service.ts` — preAuthorize, settle, getBalance functions
- Refactor LLM routes to use `withBilling` wrapper
- `/api/billing/balance` endpoint (returns current credits/tier)
- Client-side: credit balance in TopBar, 402 handling

### Phase 2: Stripe payments

Wire up Stripe for real payments.

Deliverables:
- Stripe product/price configuration (3 subscription tiers + 3 credit packs)
- `/api/stripe/checkout` — creates Checkout Session (subscription or one-time)
- `/api/stripe/webhook` — handles all events from Section 7
- `/api/stripe/portal` — creates Billing Portal session
- Client-side: upgrade modal, credit pack purchase flow, billing settings page
- Period rollover logic in webhook handler

### Phase 3: BYO key support

Deliverables:
- Key encryption/decryption utilities (app-level AES, key in env var)
- `/api/billing/keys` — CRUD for encrypted BYO keys
- Middleware update: detect BYO key, pass to LLM handler, skip credit deduction
- Client-side: key management UI in Settings panel
- Per-provider key validation (test call before saving)

### Phase 4: Analytics and admin

Deliverables:
- Revenue dashboard queries (SQL views over usage_records + credit_transactions)
- Per-user usage detail endpoint
- Admin endpoints for: manual credit adjustments, subscription overrides, user lookup
- Bridge billing events to existing SurrealDB insights system

---

## 10. Cost Analysis

### How the math works

The margin is a direct function of the markup ratio. For any pricing option:

```
Revenue per user         = subscription_price
LLM cost per user        = subscription_price / markup     (if they use full quota)
Stripe fee               = subscription_price × 0.029 + $0.30
Infrastructure per user  = negligible (< $0.20/user/mo at any scale)
Gross profit per user    = revenue - LLM cost - Stripe fee

Gross margin %           ≈ 1 - (1/markup) - 0.03
                         ≈ 64% at 3x markup
                         ≈ 46% at 2x markup
```

This holds regardless of scale. The margin percentage is constant because all costs are proportional to revenue. Infrastructure costs (Postgres, Redis, Vercel) are <2% of total costs at any meaningful scale and don't change the picture.

### Infrastructure costs (same for all options)

| Scale | Supabase | Upstash | Vercel | Firebase | Total infra |
|---|---|---|---|---|---|
| 0-100 users | $0 (free) | $0 (free) | $20 (existing) | $0 (existing) | **$20** |
| 1K users, 100 paying | $0 (free) | ~$1 | ~$40 | $0 | **~$41** |
| 10K users, 1K paying | $25 (Pro) | ~$10 | ~$150 | ~$10 | **~$195** |

Infrastructure is noise. The real question is: what do the unit economics look like per option?

### Per-option unit economics (at 1,000 users, 100 paying)

Assumptions: 10% free-to-paid conversion. 70% of paying users on Pro, 30% on Premium. Users consume 80% of their quota on average. 20% of users buy one credit pack/month.

#### Option A: Growth-First (3x markup, $15/$40)

| | Amount |
|---|---|
| Pro subscribers (70) | 70 × $15 = $1,050 |
| Premium subscribers (30) | 30 × $40 = $1,200 |
| Credit pack revenue (~20 users × $15 avg) | $300 |
| **Total revenue** | **$2,550/mo** |
| | |
| LLM cost (Pro: 70 × $5 × 0.8) | $280 |
| LLM cost (Premium: 30 × $13 × 0.8) | $312 |
| LLM cost (packs: ~$150 at 3x) | $100 |
| LLM cost (free tier: 900 × $0.50 × 0.3*) | $135 |
| **Total LLM cost** | **$827** |
| | |
| Stripe fees (~100 txns) | ~$80 |
| Infrastructure | ~$41 |
| **Total costs** | **~$948** |
| **Net margin** | **~$1,602 (63%)** |

\* *Only ~30% of free users are active enough to consume meaningful credits.*

#### Option B: Balanced (3x markup, $25/$60)

| | Amount |
|---|---|
| Pro subscribers (70) | 70 × $25 = $1,750 |
| Premium subscribers (30) | 30 × $60 = $1,800 |
| Credit pack revenue (~15 users × $22 avg) | $330 |
| **Total revenue** | **$3,880/mo** |
| | |
| LLM cost (Pro: 70 × $8.30 × 0.8) | $465 |
| LLM cost (Premium: 30 × $20 × 0.8) | $480 |
| LLM cost (packs: ~$165 at 3x) | $110 |
| LLM cost (free tier: 900 × $0.75 × 0.3) | $203 |
| **Total LLM cost** | **$1,258** |
| | |
| Stripe fees (~100 txns) | ~$118 |
| Infrastructure | ~$41 |
| **Total costs** | **~$1,417** |
| **Net margin** | **~$2,463 (63%)** |

#### Option C: Volume (2x markup, $20/$50)

| | Amount |
|---|---|
| Pro subscribers (70) | 70 × $20 = $1,400 |
| Premium subscribers (30) | 30 × $50 = $1,500 |
| Credit pack revenue (~15 users × $18 avg) | $270 |
| **Total revenue** | **$3,170/mo** |
| | |
| LLM cost (Pro: 70 × $10 × 0.8) | $560 |
| LLM cost (Premium: 30 × $25 × 0.8) | $600 |
| LLM cost (packs: ~$135 at 2x) | $180 |
| LLM cost (free tier: 900 × $1.00 × 0.3) | $270 |
| **Total LLM cost** | **$1,610** |
| | |
| Stripe fees (~100 txns) | ~$100 |
| Infrastructure | ~$41 |
| **Total costs** | **~$1,751** |
| **Net margin** | **~$1,419 (45%)** |

### Summary comparison (at 100 paying users)

| | A: Growth | B: Balanced | C: Volume |
|---|---|---|---|
| Monthly revenue | $2,550 | $3,880 | $3,170 |
| Monthly costs | $948 | $1,417 | $1,751 |
| **Net profit** | **$1,602** | **$2,463** | **$1,419** |
| **Net margin** | **63%** | **63%** | **45%** |
| Revenue per paying user | $25.50 | $38.80 | $31.70 |
| Profit per paying user | $16.02 | $24.63 | $14.19 |

Option B generates 73% more profit than Option C at the same user count, despite higher LLM costs, because the 3x vs 2x markup compounds across every interaction. The margin percentage is the dominant factor — not the subscription price.

### What changes at 1,000 paying users (10x)

Everything scales linearly. Revenue, LLM costs, and Stripe fees all 10x. Infrastructure barely moves (Postgres Pro stays $25, Redis maybe $10, Vercel ~$150). The margin percentage stays the same. At 1,000 paying users on Option B: **~$24,630/mo profit on ~$38,800/mo revenue.**

The only non-linear cost risk is **Vercel function execution time**. At 10K+ LLM calls/day with 5-30 second durations, Vercel compute charges could reach $300-500/mo. This is the trigger to move LLM routes to dedicated compute ($20/mo Railway server), as described in Section 11.

---

## 11. Scaling Considerations

### What happens as you grow and what to do about it

**1,000+ concurrent LLM requests:**
Vercel serverless handles this natively (scales horizontally). Postgres handles the billing read+write per request trivially (these are single-row operations). No architectural change needed.

**Vercel costs exceed ~$200/mo for LLM routes:**
This is the signal to move LLM proxy routes to dedicated compute (Railway, Fly.io, or a VPS). The `withBilling` middleware and all billing logic is pure Node.js — not coupled to Vercel or Next.js API route types. Migration is: deploy the same code as a standalone Express/Fastify server, update the client's base URL. The Next.js app stays on Vercel for frontend hosting.

**Postgres query latency for billing checks:**
At extreme scale, if the ~50ms Postgres read becomes a bottleneck, add a Redis cache layer in front of the subscription read. Cache the subscription doc per-user with 60-second TTL. Invalidate on Stripe webhook. This is an optimization that doesn't change the middleware interface — `preAuthorize()` checks Redis first, falls back to Postgres.

**Rate limiting complexity:**
The initial rate limiter is simple (N requests per M seconds per user). As you grow, you may want: per-model limits, burst allowances, priority queues for paid users. Upstash's `@upstash/ratelimit` SDK supports sliding window, fixed window, and token bucket algorithms. Swap the algorithm without changing the middleware interface.

**Multi-region:**
Supabase supports read replicas. Upstash supports global Redis. Vercel deploys to edge by default. When you need multi-region, each component scales independently.

**Streaming responses (future):**
If you add streaming to LLM routes, the billing flow changes slightly:
1. Pre-authorize with estimated cost (same as now)
2. Start streaming to client
3. After stream completes, calculate actual cost from accumulated tokens
4. Settle in Postgres (same as now)
5. Send final SSE event with billing info

The data model, Postgres schema, and Stripe integration don't change. Only the middleware control flow adjusts.

---

## Appendix: Model Cost Reference

Actual provider costs from `packages/ts_common/src/apis/cortex/model_registry.ts` (updated 2026-02-01):

| Model | Provider | Input $/MTok | Output $/MTok | Typical request cost* | Credits (at $0.01/cr) |
|---|---|---|---|---|---|
| gpt-5-nano | OpenAI | $0.05 | $0.40 | $0.0005 | 1 |
| gpt-5-mini | OpenAI | $0.25 | $2.00 | $0.0025 | 1 |
| gemini-3-flash-preview | Google | $0.50 | $3.00 | $0.004 | 1 |
| o4-mini | OpenAI | $1.10 | $4.40 | $0.007 | 1 |
| claude-haiku-4-5 | Anthropic | $1.00 | $5.00 | $0.007 | 1 |
| gpt-5 | OpenAI | $1.25 | $10.00 | $0.013 | 2 |
| gpt-5.2 | OpenAI | $1.75 | $14.00 | $0.018 | 2 |
| gpt-4.1 | OpenAI | $2.00 | $8.00 | $0.012 | 2 |
| gemini-3-pro-preview | Google | $2.00 | $12.00 | $0.016 | 2 |
| claude-sonnet-4-5 | Anthropic | $3.00 | $15.00 | $0.021 | 3 |
| claude-opus-4-5 | Anthropic | $5.00 | $25.00 | $0.035 | 4 |
| gpt-5.2-pro | OpenAI | $21.00 | $168.00 | $0.210 | 21 |

*Typical request: ~1,500 input tokens, ~800 output tokens (representative voice interaction).

### What the free tier buys

| Credits | Cheap models (1 cr) | Mid-tier (2-3 cr) | Premium (4 cr) | gpt-5.2-pro (21 cr) |
|---|---|---|---|---|
| 50 (Option A) | ~50 msgs | ~17-25 msgs | ~12 msgs | ~2 msgs |
| 75 (Option B) | ~75 msgs | ~25-37 msgs | ~18 msgs | ~3 msgs |
| 100 (Option C) | ~100 msgs | ~33-50 msgs | ~25 msgs | ~4 msgs |

All options provide enough to evaluate the product (one or two meaningful sessions). None provide enough for daily use — the natural upgrade trigger. The difference is how quickly users feel the constraint:

- **Option A (50 cr):** Users hit the wall in 1-2 sessions. Fast conversion pressure, but some users may bounce before seeing enough value.
- **Option B (75 cr):** 2-3 sessions worth. Enough to form a habit before needing to pay.
- **Option C (100 cr):** 3-5 sessions. Most generous evaluation period. Highest chance of "aha moment" before paywall, but slowest conversion pressure.
