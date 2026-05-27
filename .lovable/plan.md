# Why Shaun is seeing proposals that aren't his

Shaun is an **agent** (not admin). The "Proposals worth a personal nudge" widget reads from the `proposal_engagement_buckets` view, which inherits RLS from `proposals`. The `proposals_select_*` policies intentionally allow a user to see **any proposal owned by another agent in the same company** (`company_members` join). Shaun shares a company with other agents, so their hot/warm proposals leak into his dashboard.

The "Unknown client" label is a side-effect: the same RLS leak does **not** exist on `clients`, so the follow-up client lookup returns nothing and the card falls back to "Unknown client". That's the visible tell that these proposals don't belong to him.

# Fix

Keep the company-wide RLS as-is (other parts of the app rely on it for collaboration), and tighten the **hook** so the nudge widget is strictly personal.

### `src/hooks/dashboard/useAgentWarmCards.ts`
- When `userRole === "agent"`, add `.eq("agent_id", user.id)` to the `proposal_engagement_buckets` query.
- When `userRole === "admin"`, keep current behaviour (admins see all).
- No other changes; client enrichment + sorting stay the same.

### Verification
- Log in as Shaun → widget shows only proposals where `agent_id = shaun.id` (or empty state if he has none).
- Log in as an admin → widget still shows all hot/warm proposals across the org.

No DB / RLS / migration changes. Single-file edit.
