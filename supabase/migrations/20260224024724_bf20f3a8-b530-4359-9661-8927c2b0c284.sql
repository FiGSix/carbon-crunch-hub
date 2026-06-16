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