

# Expand Proposal Edit Permissions

## Summary

Allow agents, team leads, company members, and admins to edit proposals at any stage before they are signed/approved and moved to onboarding. Add a database-level status guard to prevent editing of finalized proposals.

---

## Current Behavior (broken)

**Frontend (`ProposalHeader.tsx` lines 45-49):**
```
editableStatuses = ['draft', 'sent', 'pending']
canEdit = editableStatuses.includes(status)
  && (admin OR (agent && own proposal))
```

**Database (`proposals_update_unified`):**
```
deleted_at IS NULL
AND (agent_id = auth.uid() OR is_admin())
```

### Problems
1. Missing statuses: `delivered`, `opened`, `viewed`, `stale` -- agents cannot edit proposals in these stages
2. No team lead or company member access: they can VIEW proposals but cannot EDIT them
3. No database-level status guard: technically possible to bypass the UI and edit a signed proposal

---

## New Behavior

**Rule:** A proposal is editable by agents, their team leads, their company members, and admins at any status BEFORE it reaches `approved`, `rejected`, or `signed`, and before it has `signed_at`, `archived_at`, or `deleted_at` set.

---

## Changes

### 1. Frontend: `src/components/proposals/view/ProposalHeader.tsx`

Replace the `canEdit` logic (lines 45-49):

**From:**
```typescript
const editableStatuses = ['draft', 'sent', 'pending'];
const canEdit = !isDeleted 
  && proposal 
  && editableStatuses.includes(proposal.status || '')
  && (userRole === 'admin' || (userRole === 'agent' && proposal.agent_id === user?.id));
```

**To:**
```typescript
const NON_EDITABLE_STATUSES = ['approved', 'rejected', 'signed'];
const canEdit = !isDeleted
  && proposal
  && !NON_EDITABLE_STATUSES.includes(proposal.status || '')
  && !proposal.signed_at
  && !proposal.archived_at
  && (
    userRole === 'admin'
    || (userRole === 'agent' && proposal.agent_id === user?.id)
  );
```

This uses a blocklist instead of an allowlist, so new pre-signature statuses are automatically editable without code changes. The RLS policy remains the true gatekeeper for team leads and company members.

### 2. Database Migration: Update `proposals_update_unified` RLS policy

Drop and recreate the policy to add:
- **Status guard**: Block updates when status is `approved`, `rejected`, or `signed`
- **signed_at guard**: Double-check against signed agreements
- **Company member access**: Team leads and fellow agents in the same company can update

```sql
DROP POLICY IF EXISTS "proposals_update_unified" ON public.proposals;

CREATE POLICY "proposals_update_unified"
ON public.proposals
FOR UPDATE
TO authenticated
USING (
  deleted_at IS NULL
  AND signed_at IS NULL
  AND status NOT IN ('approved', 'rejected', 'signed')
  AND (
    -- Own proposal (agent)
    auth.uid() = agent_id
    -- Company member of the agent (includes team leads)
    OR EXISTS (
      SELECT 1
      FROM company_members cm1
      JOIN company_members cm2 ON cm1.company_id = cm2.company_id
      WHERE cm1.user_id = auth.uid()
        AND cm2.user_id = agent_id
        AND cm1.status = 'active'
        AND cm2.status = 'active'
    )
    -- Admin
    OR is_current_user_admin()
  )
);
```

---

## Files Summary

| Action | File | Reason |
|---|---|---|
| Edit | `src/components/proposals/view/ProposalHeader.tsx` | Replace allowlist with blocklist for editable statuses |
| New | `supabase/migrations/...` | Update `proposals_update_unified` RLS policy with status guard and company member access |

## What Does NOT Change

- No removal of 'pending' references (separate task)
- No changes to `useProposalStatus.ts`, `statusUpdateService.ts`, or `StatusColors.ts`
- No changes to `SubmitForReviewDialog.tsx` or submission hooks
- No changes to `is_project_stakeholder()` or `can_view_proposal()`
- No table schema changes
- No edge function changes

