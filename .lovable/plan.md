## You're right — the Sales Agent shouldn't be drafting proposals

The current flow conflates two very different jobs:

- **Sales Agent's job** → qualify inbound leads (solar installers like First Energy) and convert them into **signed-up Agents** on the platform.
- **Agent's job** → once onboarded, the installer creates proposals for *their own* end-clients (the asset owners). They have the project data (system size, address, commission date) — we don't.

By auto-drafting a proposal from a lead, we:
1. Create empty/broken proposal records (the "missing info" you saw on First Energy).
2. Pollute the proposals list with shells that no one can complete (we don't have the project data).
3. Skip the onboarding step that actually matters — getting the installer signed up, contracted, and trained.
4. Confuse the agent dashboards (these ghost proposals show up in warm-cards, portfolio review, close-out queue counts).

## Revised plan

**1. Stop auto-drafting proposals from leads**
- Remove the `sales-agent-draft-proposal` call from wherever the Sales Agent triggers it (likely when a lead reaches a "qualified" stage).
- Keep the edge function file in place but no longer invoke it. We can delete it in a follow-up once we're sure nothing else calls it.

**2. Replace it with an "invite as Agent" action**
- When the Sales Agent marks a lead as ready, the next step should be to **send an agent invitation** to the lead's email (using the existing agent invitation / onboarding flow).
- Surface this in the Sales Agent admin UI as the primary CTA on a qualified lead: **"Invite as Agent"** (instead of "Draft proposal").
- Log the invite on the lead timeline (`candidate_notes` with `kind: 'system'`).

**3. Clean up the ghost proposals already created**
- One-time migration to identify proposals where `source = 'sales_agent'` AND project data is empty AND nothing has been added since.
- Two options — need your call:
  - **(a)** Hard delete them (cleanest — these are noise).
  - **(b)** Soft-archive them (set `archived_at`) so they drop out of all dashboard counts but stay auditable.
- For each affected lead, if the installer hasn't been invited yet, queue an agent invitation instead.

**4. Update lead → proposal linkage expectations**
- `proposals.lead_id` stays in the schema but is now only populated when an onboarded Agent (who originated as a lead) creates their first proposal — we can backfill it by matching the agent's email to the source lead. Optional, low priority.

## Files affected

- `supabase/functions/sales-agent-draft-proposal/index.ts` — stop invoking (delete in a later pass)
- Sales Agent admin UI (the component that currently triggers the draft) — swap CTA to "Invite as Agent", wire to existing agent-invite flow
- One-time SQL migration — archive/delete ghost proposals
- `AgentWarmCards`, `PortfolioReviewSection`, `CloseoutQueueSection` — verify their queries already filter out archived/deleted proposals (they should, but worth a quick check)

## Out of scope

- No changes to the Agent's own proposal creation flow.
- No changes to lead intake / scoring.
- No changes to the proposal view itself — once ghosts are cleaned, the "missing info" problem disappears.

## Questions before I build

1. **Clean up existing ghost proposals: delete or soft-archive?** Delete is cleaner; archive is safer for audit.
2. **Where today does the Sales Agent trigger `sales-agent-draft-proposal`?** I'll find it, but if you know off the top of your head (e.g. a specific button or an automation when a lead hits a stage), tell me so I don't miss a trigger.
3. **The "Invite as Agent" action — does the existing agent invitation flow already accept an email + name + company, or do we need a small wrapper?** I'll check, but a quick confirmation helps.
