-- Enable required extensions for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule the proposal automation to run daily at 9:00 AM SAST (7:00 AM UTC)
SELECT cron.schedule(
  'proposal-automation-daily',
  '0 7 * * *',  -- Every day at 7:00 AM UTC (9:00 AM SAST)
  $$
  SELECT
    net.http_post(
      url := 'https://uyjryuopuqgmsvayiccl.supabase.co/functions/v1/proposal-automation',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV5anJ5dW9wdXFnbXN2YXlpY2NsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQyNzU2MzgsImV4cCI6MjA1OTg1MTYzOH0.M828t6sJxh4lZAVACqpRosoRvW_VibHDAMSXV-3WrLo"}'::jsonb,
      body := '{}'::jsonb
    ) as request_id;
  $$
);