# Cortex Voice Agent LLC Setup Plan (Missouri)

## Step 1: Choose Your LLC Name
- Must end with "LLC" or "Limited Liability Company"
- Search availability: https://bsd.sos.mo.gov/BusinessEntity/BESearch.aspx
- Example: "Cortex Labs LLC", "Cortex AI LLC", etc.

## Step 2: File Articles of Organization with Missouri
- Website: https://bsd.sos.mo.gov/
- Filing fee: **$50 online**
- You'll need: LLC name, registered agent (can be yourself + your St. Louis address), organizer name
- Processing: ~3-5 business days online

## Step 3: Get an EIN (Employer Identification Number)
- Website: https://www.irs.gov/businesses/small-businesses-self-employed/apply-for-an-employer-identification-number-ein-online
- Cost: **Free**
- Takes: ~5 minutes, issued instantly online
- Need this before opening a bank account

## Step 4: Create an Operating Agreement
- Not required by Missouri but strongly recommended
- Single-member LLC operating agreement template is fine
- Documents ownership, profit distribution, management structure
- Keep on file — banks and payment processors sometimes ask for it

## Step 5: Open a Business Bank Account
- Recommended: **Mercury** (https://mercury.com) — free, online, startup-friendly
- Alternative: Local option like Commerce Bank (HQ'd in St. Louis)
- Bring: Articles of Organization, EIN letter, Operating Agreement, personal ID
- Keep business finances completely separate from personal

## Step 6: Register for Missouri Business Taxes
- Register with Missouri DOR: https://mytax.mo.gov/
- Sales tax on SaaS in Missouri: currently **not taxed** (Missouri doesn't tax SaaS as of 2024 — verify current status)
- You'll still owe federal + state income tax on profits (pass-through on personal return)

## Step 7: Set Up Stripe Under the LLC
- Create Stripe account (or update existing) with LLC details
- Provide: EIN, business bank account, LLC name + address
- Enable Stripe Billing for recurring subscriptions

## Step 8: Wire Up Payments in Cortex
- Implement `/api/create-checkout-session` endpoint
- Connect Stripe webhooks for `subscription_created`, `subscription_updated`, `subscription_deleted`
- Update user records on subscription changes

---

## Estimated Costs

| Item | Cost |
|---|---|
| Missouri LLC filing | $50 |
| EIN | Free |
| Operating Agreement | Free (template) |
| Mercury bank account | Free |
| Stripe account | Free (2.9% + 30c per transaction) |
| **Total upfront** | **$50** |

## Ongoing Costs

| Item | Cost |
|---|---|
| Missouri Annual Report | Free (Missouri doesn't require annual reports for LLCs) |
| Registered Agent (if using yourself) | Free |
| Stripe fees | 2.9% + 30c per transaction |

## Timeline
- **Day 1:** File LLC + apply for EIN
- **Day 2-5:** Wait for LLC approval
- **Day 5:** Open bank account, draft operating agreement
- **Day 6:** Set up Stripe, register with Missouri DOR
- **Day 7+:** Implement payment integration in Cortex

## Notes
- Missouri is one of the cheapest and simplest states for LLC formation
- No annual report requirement, no franchise tax — very low maintenance
- Single-member LLC profits pass through to your personal tax return (Schedule C)
- Consider hiring a CPA at tax time to maximize deductions (API costs, hosting, etc.)
- Revisit structure if/when raising funding or revenue exceeds ~$50-80k (S-Corp election)
