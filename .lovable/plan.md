## Problem

shaun@nuvoconsulting tried to create a proposal and got "Proposal Creation Failed". Postgres logs show:

> ERROR: new row violates row-level security policy for table "proposals"

Diagnosis:
- shaun's profile: `role = 'super_partner'`, `can_create_proposals = true`.
- `CreateProposal.tsx` allows Super Partners through when `can_create_proposals` is true.
- But the RLS policy `proposals_insert_unified` only permits inserts when:
  - `auth.uid() = agent_id` AND
  - caller is admin **OR** caller is an `agent` with `agent_status = 'active'`.
- Super Partners are not in that whitelist, so every insert they attempt is rejected at the database, regardless of the frontend toggle.

## Fix

Single migration that updates the `proposals_insert_unified` policy to also allow active Super Partners who have `can_create_proposals = true`:

```sql
DROP POLICY IF EXISTS proposals_insert_unified ON public.proposals;

CREATE POLICY proposals_insert_unified
ON public.proposals
FOR INSERT
WITH CHECK (
  auth.uid() = agent_id
  AND (
    is_current_user_admin()
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.deleted_at IS NULL
        AND (
          (p.role = 'agent' AND p.agent_status = 'active')
          OR (p.role = 'super_partner' AND COALESCE(p.can_create_proposals, false) = true)
        )
    )
  )
);
```

No code changes required — `CreateProposal.tsx` already gates Super Partners on `can_create_proposals`, and `unifiedProposalService` already sets `agent_id = auth.uid()`. Existing agent behaviour is unchanged.

## Verification

1. Sign in as shaun and create a proposal end-to-end → succeeds.
2. Sign in as a Super Partner **without** `can_create_proposals` → still blocked (AccessNotEnabled UI + RLS).
3. Sign in as a regular active agent → unaffected.
