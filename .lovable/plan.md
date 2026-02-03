

# Implement Status-Only Stale Proposal Cron Job

## Overview

Replace the email automation cron job with a simple status update job that only marks proposals as "stale" after 10 days of inactivity - no emails sent.

---

## Step 1: Delete Email Automation Cron Job

Run SQL to remove Job #6 (`run-proposal-automation-daily`):

```sql
SELECT cron.unschedule(6);
```

This removes the cron job that was triggering the `proposal-automation` function (which sends emails).

---

## Step 2: Modify Edge Function for Cron Access

**File:** `supabase/functions/backfill-stale-proposals/index.ts`

Update the authentication logic to support **both** cron secret (for scheduled runs) and admin auth (for manual runs):

```typescript
// Check for cron secret first (for scheduled runs)
const cronSecret = Deno.env.get('CRON_SECRET');
const providedSecret = req.headers.get('x-cron-secret');
const isCronJob = cronSecret && providedSecret === cronSecret;

if (!isCronJob) {
  // Require admin auth for manual runs
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'No authorization' }), { status: 401 });
  }
  // ... existing admin auth check ...
}

// Proceed with status updates (same logic as current)
```

---

## Step 3: Update Config to Allow Cron Calls

**File:** `supabase/config.toml`

Change `verify_jwt = true` to `verify_jwt = false`:

```toml
[functions.backfill-stale-proposals]
verify_jwt = false
```

This allows the cron job to call the function without a JWT (secured by cron secret instead).

---

## Step 4: Add Cron Secret

You'll need to add a secret in **Supabase Dashboard > Edge Functions > Secrets**:

| Key | Value |
|-----|-------|
| `CRON_SECRET` | `stale-proposal-update-2024-secure` (or generate your own UUID) |

---

## Step 5: Create New Status-Only Cron Job

Run SQL to schedule daily status updates at 8 AM UTC:

```sql
SELECT cron.schedule(
  'update-stale-proposal-statuses',
  '0 8 * * *',
  $$
  SELECT net.http_post(
    url := 'https://uyjryuopuqgmsvayiccl.supabase.co/functions/v1/backfill-stale-proposals',
    headers := '{"Content-Type": "application/json", "x-cron-secret": "stale-proposal-update-2024-secure"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
```

---

## Step 6: Run Initial Backfill

Execute one-time SQL to update the ~70 currently stale proposals:

```sql
UPDATE proposals
SET status = 'stale', updated_at = NOW()
WHERE deleted_at IS NULL 
  AND signed_at IS NULL
  AND status IN ('sent', 'delivered', 'opened', 'viewed')
  AND invitation_sent_at IS NOT NULL
  AND EXTRACT(DAY FROM (NOW() - COALESCE(last_engagement_at, invitation_sent_at))) >= 10;
```

---

## Files Changed

| File | Change |
|------|--------|
| `supabase/functions/backfill-stale-proposals/index.ts` | Add cron secret authentication alongside admin auth |
| `supabase/config.toml` | Set `verify_jwt = false` for backfill function |

---

## SQL Commands (Run in Supabase Dashboard)

1. Delete old cron job: `SELECT cron.unschedule(6);`
2. Create new cron job (after secret is added)
3. Run initial backfill update

---

## Result

| Before | After |
|--------|-------|
| Email automation cron (Job #6) | ❌ Deleted |
| Status update cron | ✅ Created (`update-stale-proposal-statuses`) |
| ~70 stale proposals showing "sent"/"delivered" | ✅ Updated to "stale" |
| Weekly roundup emails (Job #5) | ✅ Unchanged |

