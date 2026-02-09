# Cortex Voice Agent: Comprehensive Monetization Strategy

## Executive Summary
This document outlines a **Freemium + Pro Subscription** monetization strategy for the Cortex Voice Agent (`cortex_0`). The goal is to maximize user adoption through a capable free tier while driving revenue from power users who require advanced reasoning, cloud synchronization, and extensive long-term memory.

**Core Philosophy:** "Local is Free, Cloud is Premium."
*   **Free Tier:** A fully functional, privacy-first local assistant.
*   **Pro Tier:** A synchronized, high-intelligence agent with unlimited memory.

---

## 1. Tier Structure & Pricing

### 🛡️ Cortex Core (Free)
*Target: Casual users, privacy advocates, developers testing the platform.*

*   **Storage:** Local Browser Storage (IndexedDB) only. No cross-device sync.
*   **AI Models:** Standard efficiency models (e.g., `gpt-4o-mini`, `gemini-flash`).
*   **Memory Limit:** 50 "Facts" in the Knowledge Graph.
*   **Voice:** Standard Web Speech API (Free, unlimited).
*   **Functions:** Access to built-in standard tools only.
*   **Rate Limits:** Generous but capped daily interactions to prevent abuse if API keys are subsidized.

### ⚡ Cortex Pro ($20/month)
*Target: Power users, professionals, researchers.*

*   **Storage:** **Cloud Sync (SurrealDB).** Access your agent state from any device.
*   **AI Models:** **Frontier Intelligence** (`gpt-4o`, `claude-3.5-sonnet`, `gemini-1.5-pro`).
*   **Memory Limit:** **Unlimited** Knowledge Graph & Vector Search.
*   **Voice:** **Premium Neural TTS** (OpenAI/ElevenLabs) for human-like interaction.
*   **Functions:** **Dynamic Function Creation** (write & save custom JS) + MCP Server Integration.
*   **Support:** Priority processing and early access to new features.

---

## 2. Feature Gating Logic

This section details *where* and *how* to implement restrictions in the codebase.

### A. Intelligence (Model Selection)
**File:** `components/TopBar.tsx`, `hooks/useCortexAgent.ts`
*   **Logic:** The model dropdown should visually distinguish "Pro" models.
*   **Implementation:**
    *   Add a `isPro` flag to model definitions.
    *   If a Free user selects a Pro model, show a lock icon 🔒 and trigger an "Upgrade to Pro" modal.
    *   *Fallback:* If a request is made to a Pro model API by a non-Pro user, automatically downgrade to `gpt-4o-mini` and notify the user.

### B. Memory & Storage (The "Sync" Wall)
**File:** `cortex_agent_web.ts`, `graph_utils.ts`
*   **Logic:** The most compelling feature is **Continuity**.
*   **Implementation:**
    *   **Check:** In `check_login_status`, return `subscriptionTier`.
    *   **Write Gate:** In `store_declarative_knowledge`, check `(currentFactCount >= 50 && tier === 'free')`.
        *   *If true:* Throw error: "Memory Full. Upgrade to Cortex Pro for unlimited long-term memory."
    *   **Sync Gate:** Disable the database sync loop for Free users. Their `SurrealDB` connection should either be local-only or non-existent (using `localStorage` adapter).

### C. Voice & Personality
**File:** `app3.tsx`, `components/tivi`
*   **Logic:** High-quality voice costs money per character.
*   **Implementation:**
    *   **Free:** Use `window.speechSynthesis` (standard browser voices) or a lower-quality/free TTS tier.
    *   **Pro:** Enable OpenAI TTS / ElevenLabs API integration.
    *   **Toggle:** In Settings, "HD Voice" toggle is locked for Free users.

### D. Extensibility (Dynamic Functions)
**File:** `cortex_agent_web.ts` (Dynamic Functions section)
*   **Logic:** Custom code execution uses server resources and provides immense value.
*   **Implementation:**
    *   **Create:** The `create_dynamic_function` tool should return a permission error for Free users.
    *   **MCP:** `get_agent_with_mcp` loading should be restricted or limited to 1 custom server for Free users.

---

## 3. Technical Implementation Roadmap

### Phase 1: Identity & State (Weeks 1-2)
1.  **User Metadata:**
    *   Update your User schema (Firebase/Auth) to include `plan_id`, `stripe_customer_id`, `subscription_status`.
2.  **State Management:**
    *   Update `useCortexStore` to hold `subscriptionStatus`.
    *   Create a `useSubscription` hook that checks status on init and periodically.

### Phase 2: The Paywall UI (Weeks 3-4)
1.  **Upgrade Modal:**
    *   Create a beautiful, dismissible modal listing Pro benefits.
    *   Trigger points:
        *   Selecting GPT-4o.
        *   Saving the 51st fact.
        *   Trying to enable Cloud Sync.
2.  **Settings Panel:**
    *   Add a "Subscription" tab in `SettingsPanel.tsx`.
    *   Display "Current Plan: Free" with a prominent "Upgrade" button.

### Phase 3: Payments & Provisioning (Weeks 5-6)
1.  **Provider:** **Lemon Squeezy** is recommended for SaaS (handles global tax/VAT automatically) or **Stripe**.
2.  **Checkout Flow:**
    *   Clicking "Upgrade" calls an API route `/api/create-checkout-session`.
    *   Redirects user to hosted checkout.
    *   Webhook listens for `subscription_created` -> Updates Firebase/Database user record.
3.  **Portal:** Allow users to manage/cancel subscription via a Customer Portal link.

---

## 4. Growth & "Nudge" Strategy

Don't just block users; sell the value.

1.  **The "Memory Full" Nudge:**
    *   When the user saves a fact and is near the limit (e.g., 45/50), have the Agent say: *"I'm filling up my local memory. Just 5 slots left before I might start forgetting things unless we upgrade."*
2.  **The "Intelligence" Teaser:**
    *   If the user asks a complex reasoning question that the small model fails at, suggest: *"I could answer this with more depth using my Pro brain (GPT-4o). Would you like to try it?"*
3.  **The "Sync" Value:**
    *   On the login screen: *"Switching devices? Upgrade to Pro to take your Agent with you."*

## 5. Pricing Justification

*   **$20/month** aligns with ChatGPT Plus / Claude Pro.
    *   *Why pay Cortex instead of them?*
        *   **Customization:** You own the prompt, the tools, and the JS execution environment.
        *   **Integration:** Cortex connects to *your* local environment and specific knowledge graph.
        *   **Voice:** A dedicated voice-first experience is different from a chat interface.

## 6. Token Usage Cost Control (Backend)

To ensure profitability on the Pro plan:
1.  **Cache Heavy:** Use the `cache_utils.ts` extensively to avoid re-generating generic responses.
2.  **Context Window Management:** Don't send the entire 100-message history for every "Hello". Summarize older context.
3.  **Model Routing:**
    *   Use `gpt-4o-mini` for classification/routing (is this a complex query?).
    *   Only call `gpt-4o` when deep reasoning is actually detected.

## 7. Immediate Action Items

1.  **Modify `check_login_status`** in `cortex_agent_web.ts` to return mock subscription data (`tier: 'free'`) to start building the frontend logic.
2.  **Design the "Locked" UI states** for the Model Selector in `TopBar.tsx`.
3.  **Update `instructions.txt`** or project docs to reflect this new business logic as a core requirement.
