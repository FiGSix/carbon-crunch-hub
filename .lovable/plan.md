

# Fix: Agent Invitation Resend for Expired Invitations

## Problem

The `send-agent-invitation` edge function fails when trying to re-invite an agent whose previous invitation has `status = 'expired'`. The code only handles the case where `status = 'pending'` and the expiry date has passed -- it does not handle records already marked as `expired` in the database.

This causes a `duplicate key value violates unique constraint "agent_invitations_email_key"` error.

## Root Cause

In `supabase/functions/send-agent-invitation/index.ts`, line 244:

```typescript
if (existingInvitation && existingInvitation.status === 'pending') {
```

This condition skips invitations with `status = 'expired'`, so the old record is never deleted, and the INSERT fails on the unique constraint.

## Solution

Update the conditional logic to also handle invitations with `status = 'expired'` (or `accepted`) -- delete any non-pending expired or stale invitation before creating a new one.

## File Changes

### `supabase/functions/send-agent-invitation/index.ts`

Replace the existing invitation handling block (around lines 244-267) with logic that:

1. If status is `pending` and NOT expired: block the request (invitation still active)
2. If status is `pending` but expired, OR status is `expired` or `accepted`: DELETE the old record and allow creating a new one

```text
Before (simplified):
  if (status === 'pending') {
    if (not expired) -> block
    else -> delete old, continue
  }
  // status === 'expired' falls through to INSERT -> FAILS

After (simplified):
  if (status === 'pending' && not expired) -> block
  else if (existingInvitation) -> delete old, continue
```

This is a single-file change to the edge function. No database or frontend changes needed.
