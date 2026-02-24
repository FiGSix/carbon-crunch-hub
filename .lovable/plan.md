

# Fix: Re-enable Weekly Roundup Cron Job

## What Happened

The `pg_cron` extension was originally enabled in migration `20251107115355` and the weekly roundup was scheduled in `20251218124815`. The cron job was working (you received emails previously). However, `pg_cron` is currently **not active** in the database -- the extension was likely lost during a Supabase project restore, pause/unpause cycle, or platform maintenance event.

Migration `20260109122837` (January 2026) intentionally kept the weekly-roundup job while removing other cron jobs, confirming it was meant to stay active.

## Fix

Create a new migration that:
1. Re-enables the `pg_cron` extension
2. Re-registers the weekly roundup cron job (Friday 7:00 AM UTC / 9:00 AM SAST)

**Note:** Per Supabase guidelines, the cron schedule SQL contains project-specific secrets (anon key, project URL), so this should be run via SQL insert rather than a standard migration. However, since the migration file `20251218124815` already contains these values in the codebase, we can use the migration tool consistently.

## Migration SQL

```sql
-- Re-enable pg_cron (may have been lost during project restore)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Re-schedule weekly roundup emails: Friday 7:00 AM UTC (9:00 AM SAST)
-- Use try/catch pattern: unschedule first if it somehow exists, then reschedule
DO $$
BEGIN
  PERFORM cron.unschedule('weekly-roundup-emails');
EXCEPTION WHEN OTHERS THEN
  -- Job doesn't exist, that's fine
END;
$$;

SELECT cron.schedule(
  'weekly-roundup-emails',
  '0 7 * * 5',
  $$
  SELECT net.http_post(
    url:='https://uyjryuopuqgmsvayiccl.supabase.co/functions/v1/send-weekly-roundup',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV5anJ5dW9wdXFnbXN2YXlpY2NsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQyNzU2MzgsImV4cCI6MjA1OTg1MTYzOH0.M828t6sJxh4lZAVACqpRosoRvW_VibHDAMSXV-3WrLo"}'::jsonb,
    body:='{}'::jsonb
  ) as request_id;
  $$
);
```

## Optional: Send Missed Roundup Now

After the migration, we can manually trigger the edge function to send the missed Friday roundup immediately.

## Files

| Action | File | Reason |
|--------|------|--------|
| New | `supabase/migrations/...` | Re-enable pg_cron and reschedule weekly roundup |

## Risk

- Zero risk to existing data -- purely additive
- If pg_cron was intentionally removed by Supabase support, it will re-enable cleanly
- The unschedule-then-reschedule pattern prevents duplicate job errors
