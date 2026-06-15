# Super Partner — Consolidated Bug-Fix Plan

Fix the 12 issues found in the audit, in dependency order. One SQL migration, one edge-function edit, two frontend edits. No refactors; existing client/agent/admin behavior untouched.

## 1. SQL migration (single file)

**a. Respect `platform_fee_override` at signing**
In `handle_proposal_signing_commissions`, wrap the `platform_fee_percentage` assignment:
```
IF NOT COALESCE(NEW.platform_fee_override, false) THEN
  NEW.platform_fee_percentage := 100 - NEW.client_share_percentage
    - NEW.agent_commission_percentage - COALESCE(v_sp_rate, 0);
END IF;
```

**b. Backfill must also snapshot proposals**
Extend `backfill_super_partner_commissions(p_super_partner_id)` so that, for each historical signed proposal of a linked agent, it additionally runs:
```
UPDATE public.proposals
   SET super_partner_id = p_super_partner_id,
       super_partner_commission_percentage = v_rate,
       platform_fee_percentage = CASE WHEN COALESCE(platform_fee_override,false)
                                      THEN platform_fee_percentage
                                      ELSE 100 - client_share_percentage
                                           - agent_commission_percentage - v_rate END
 WHERE id = r.id;
```

**c. Auto-link new agents on signup**
Update `handle_new_user` (the auth → profiles trigger): after inserting the profile, if an `agent_invitations` row exists for `NEW.email` with non-null `super_partner_id`, copy it onto `profiles.super_partner_id` and set `super_partner_commission_rate` via `get_super_partner_rate(...)`.

**d. New RPC: `request_agent_link_by_email(p_email text)`**
`SECURITY DEFINER`, callable by super_partner role. Resolves the agent profile by email, validates the caller is a super partner, then inserts a `super_partner_link_requests` row (`request_type='link'`, `status='pending'`). Returns the request id. Used by `SuperPartnerMyAgents`.

**e. New RPC: `get_super_partner_commission_ledger()`**
`SECURITY DEFINER`, returns ledger rows joined with `proposals` (client name, agent name, system_size_kwp, signed_at, amount, rate, status). Filtered to `super_partner_id = auth.uid()` OR admin.

**f. New RPC: `recalc_super_partner_rates(p_super_partner_id uuid)`**
Admin-only. Recomputes `super_partner_commissions.commission_percentage` and `commission_amount` for that SP using current `get_super_partner_rate`, and refreshes the `proposals.super_partner_commission_percentage` snapshot. Exposed via a button on the admin SP detail.

**g. Unique partial index on link requests**
```
CREATE UNIQUE INDEX super_partner_link_requests_pending_uniq
  ON public.super_partner_link_requests (super_partner_id, agent_id, request_type)
  WHERE status = 'pending';
```

**h. `agent_status` on SP profile**
Update `create-super-partner` (edge fn, not SQL) to set `agent_status = 'active'` on the inserted profile so SP rows appear in standard filters.

## 2. Edge function: `send-agent-invitation`
- Allow caller role `admin` OR `super_partner`.
- If caller is `super_partner`: force `super_partner_id = caller.id` (ignore body value).
- If caller is `admin`: accept `super_partner_id` from body as-is (nullable).
- Persist `super_partner_id` on the inserted `agent_invitations` row.

## 3. Edge function: `create-super-partner`
- Add `agent_status: 'active'` to the profile upsert.

## 4. Frontend

**`src/contexts/auth/AuthContext.tsx`** — add `super_partner_id` and `super_partner_status` to the profiles select and to the constructed `UserProfile`. Same change in `src/hooks/auth/useProfileLoader.ts`. Extend `UserProfile` type accordingly.

**`src/pages/SuperPartnerMyAgents.tsx`**
- `submitLinkRequest`: call `supabase.rpc('request_agent_link_by_email', { p_email })` instead of querying `profiles` directly. Remove the "Agent not found" silent dead-end.
- `requestLink('unlink', ...)`: keep current insert; the new unique index will surface duplicates as a friendly toast.

**`src/pages/SuperPartnerCommission.tsx`** — replace direct `super_partner_commissions` select with `supabase.rpc('get_super_partner_commission_ledger')`; render client name, agent name, MWp, signed date, amount, rate, status.

**`src/pages/AdminSuperPartnerManagement.tsx`** — add a "Recalculate rates" button per SP that calls `recalc_super_partner_rates`.

## Out of scope (acknowledged, deferred)
- Realtime channels on SP tables (#12) — not needed for v1.
- Cosmetic agent-name display in admin link-requests list (#10) — addressed by ledger RPC pattern if needed later.

## Verification after build
1. Admin creates SP → SP appears in list with `active` status.
2. SP invites new agent by email → agent signs up → `profiles.super_partner_id` auto-populated.
3. SP requests link to existing agent by email → request appears in admin queue; second click is rejected by unique index.
4. Admin approves link + clicks Backfill → historical proposals show SP snapshot and ledger rows.
5. Sign a proposal with `platform_fee_override = true` → fee unchanged; without override → fee = 100 − client − agent − SP rate.
6. SP dashboard + commission page render names, MWp, and amounts.
