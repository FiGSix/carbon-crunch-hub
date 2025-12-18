-- Schedule weekly roundup emails for Friday 9:00 AM SAST (7:00 AM UTC)
SELECT cron.schedule(
  'weekly-roundup-emails',
  '0 7 * * 5',
  $$
  SELECT net.http_post(
    url:='https://uyjryuopuqgmsvayiccl.supabase.co/functions/v1/send-weekly-roundup',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV5anJ5dW9wdXFnbXN2YXlpY2NsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQyNzU2MzgsImV4cCI6MjA1OTg1MTYzOH0.M828t6sJxh4lZAVACqpRosoRvW_VibHDAMSXV-3WrLo"}'::jsonb,
    body:='{}'::jsonb
  );
  $$
);