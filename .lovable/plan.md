

# Backfill Stale Proposal Statuses - Implementation Plan

## Problem Summary

There are **70 proposals** that should be marked as "stale" but are still showing statuses like "sent", "delivered", "opened", or "viewed". This is happening because:

1. **No cron job exists** - The `proposal-automation` edge function isn't scheduled to run automatically
2. **The automation hasn't been triggered** - No logs exist for this function, indicating it hasn't run recently

### Current Database State

| Status | Count | Should Be |
|--------|-------|-----------|
| draft | 630 | No change |
| sent | 64 | ~44 should be stale |
| stale | 60 | Correct |
| delivered | 27 | ~22 should be stale |
| bounced | 1 | No change |

**Total proposals that need status update: 70**

These are proposals where:
- `invitation_sent_at` exists (email was sent)
- No activity for 10+ days (`last_engagement_at` is null or stale)
- Not signed (`signed_at` is null)
- Status is still "sent", "delivered", "opened", or "viewed"

---

## Solution: Two Parts

### Part 1: Create a Backfill Edge Function

Create a new edge function `backfill-stale-proposals` that:
1. Finds all proposals matching the stale criteria (10+ days no engagement)
2. Updates their status to "stale" 
3. Logs each update using the existing `update_proposal_status_with_log` RPC
4. Returns a summary of what was updated

This is a one-time fix that can also be re-run anytime.

### Part 2: Schedule Proposal Automation (Cron Job)

Set up a PostgreSQL cron job to run the `proposal-automation` function daily so this doesn't happen again. The automation already handles:
- Sending reminder emails
- Sending graceful exit emails
- Marking proposals as stale

---

## Implementation Details

### Part 1: Backfill Edge Function

**New File:** `supabase/functions/backfill-stale-proposals/index.ts`

```typescript
serve(async (req: Request) => {
  // 1. Query proposals that should be stale
  const { data: proposals } = await supabase
    .from('proposals')
    .select('id, title, status, invitation_sent_at, last_engagement_at')
    .in('status', ['sent', 'delivered', 'opened', 'viewed'])
    .is('deleted_at', null)
    .is('signed_at', null)
    .not('invitation_sent_at', 'is', null);

  // 2. Filter to those 10+ days inactive
  const staleDays = 10;
  const now = new Date();
  const staleProposals = proposals.filter(p => {
    const lastActivity = p.last_engagement_at || p.invitation_sent_at;
    const daysSince = (now - new Date(lastActivity)) / (1000 * 60 * 60 * 24);
    return daysSince >= staleDays;
  });

  // 3. Update each to stale with proper logging
  for (const proposal of staleProposals) {
    await supabase.rpc('update_proposal_status_with_log', {
      proposal_id: proposal.id,
      new_status: 'stale',
      trigger_event: 'backfill_stale_status',
      is_automated: true
    });
  }

  return { updated: staleProposals.length };
});
```

**Config Update:** `supabase/config.toml`

```toml
[functions.backfill-stale-proposals]
verify_jwt = true
```

### Part 2: Schedule Cron Job for Proposal Automation

Use the Supabase SQL editor to create a daily cron job:

```sql
SELECT cron.schedule(
  'run-proposal-automation-daily',
  '0 8 * * *',  -- Run daily at 8 AM UTC
  $$
  SELECT net.http_post(
    url := 'https://uyjryuopuqgmsvayiccl.supabase.co/functions/v1/proposal-automation',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer <anon_key>"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
```

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `supabase/functions/backfill-stale-proposals/index.ts` | Create | New edge function for one-time backfill |
| `supabase/config.toml` | Modify | Add function config for backfill |

---

## Execution Plan

1. **Create backfill function** - Deploy new edge function
2. **Run backfill** - Call the function to update the 70 stale proposals
3. **Set up cron job** - Use SQL editor to schedule daily automation (this requires running SQL directly in Supabase dashboard)

---

## Expected Results

After running the backfill:

| Status | Before | After |
|--------|--------|-------|
| sent | 64 | ~20 |
| delivered | 27 | ~5 |
| stale | 60 | ~130 |

---

## Alternative: Quick One-Time Fix

If you prefer a quick fix without creating a new function, I can provide SQL to run directly in the Supabase SQL Editor:

```sql
-- Preview what will be updated
SELECT id, title, status, 
       EXTRACT(DAY FROM (NOW() - COALESCE(last_engagement_at, invitation_sent_at))) as days_inactive
FROM proposals
WHERE deleted_at IS NULL 
  AND signed_at IS NULL
  AND status IN ('sent', 'delivered', 'opened', 'viewed')
  AND invitation_sent_at IS NOT NULL
  AND EXTRACT(DAY FROM (NOW() - COALESCE(last_engagement_at, invitation_sent_at))) >= 10;

-- Then run the update
UPDATE proposals
SET status = 'stale'
WHERE deleted_at IS NULL 
  AND signed_at IS NULL
  AND status IN ('sent', 'delivered', 'opened', 'viewed')
  AND invitation_sent_at IS NOT NULL
  AND EXTRACT(DAY FROM (NOW() - COALESCE(last_engagement_at, invitation_sent_at))) >= 10;
```

This direct SQL approach is faster but doesn't create individual status change logs.

