## Goal

Agents who sign up without completing company info should:
1. Render as **"Private"** in the Admin → Partners table (instead of "No company")
2. Still receive the commission override inherited from their inviting super-partner (e.g. 7%), instead of falling back to the MWp-tier default (4%).

## Changes

### 1. Backend — `get_agents_management_data` RPC
Update the RPC so that when an agent has no `company_members` row:
- Return `company_name = 'Private'` (instead of NULL / "No company")
- Resolve `commission_override` by walking up to the **inviting super-partner** and using their configured sub-agent override rate. Lookup order:
  1. Agent's own `profiles.commission_override` (if set directly)
  2. Inviting super-partner's default sub-agent override (from `profiles` / super-partner config of the user who invited them via `agent_invitations`)
  3. Fall back to MWp tier only if neither exists

### 2. Frontend — `AdminSuperPartnerManagement.tsx` (Partners table)
- Where the row currently shows "No company", show **"Private"** in a muted style so it's visually distinct from a real company name.
- Commission column already reads from the RPC output, so once the RPC returns the inherited override, the % displays correctly with no additional logic.

### 3. Trigger for future-proofing (optional but recommended)
Add a lightweight trigger so a new agent invited by a super-partner has their `profiles.invited_by_super_partner_id` (or equivalent existing field) populated at signup — this is what the RPC uses to resolve the inherited rate. If the linkage already exists via `agent_invitations`, skip this and just join through it in the RPC.

## Technical notes

- No schema changes required — this is a **read-path fix** in the RPC plus a label change in the UI.
- The earlier proposed data-repair migration (inserting `company_members` rows for solo companies) is **no longer needed** — we're explicitly modeling "no company = Private" rather than forcing a synthetic membership.
- Existing agents with real companies are unaffected.
- Resolution chain for the inherited rate will be implemented as `COALESCE(agent_override, super_partner_sub_agent_default, mwp_tier_rate)`.

## Out of scope

- No changes to signup flow (agents can still complete company info later and the row will switch from "Private" to the real company name automatically).
- No changes to commission calculation for agents who already belong to a company.
