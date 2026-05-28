
-- Unschedule if exists (idempotent)
DO $$ BEGIN
  PERFORM cron.unschedule('cora-enrich-every-5-min');
EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN
  PERFORM cron.unschedule('discovery-midday');
EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN
  PERFORM cron.unschedule('cora-preset-expand-daily');
EXCEPTION WHEN OTHERS THEN NULL; END $$;

SELECT cron.schedule(
  'cora-enrich-every-5-min',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://uyjryuopuqgmsvayiccl.supabase.co/functions/v1/cora-enrich',
    headers := '{"Content-Type": "application/json", "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV5anJ5dW9wdXFnbXN2YXlpY2NsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQyNzU2MzgsImV4cCI6MjA1OTg1MTYzOH0.M828t6sJxh4lZAVACqpRosoRvW_VibHDAMSXV-3WrLo"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

SELECT cron.schedule(
  'discovery-midday',
  '0 12 * * *',
  $$
  SELECT net.http_post(
    url := 'https://uyjryuopuqgmsvayiccl.supabase.co/functions/v1/discovery-cron',
    headers := '{"Content-Type": "application/json", "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV5anJ5dW9wdXFnbXN2YXlpY2NsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQyNzU2MzgsImV4cCI6MjA1OTg1MTYzOH0.M828t6sJxh4lZAVACqpRosoRvW_VibHDAMSXV-3WrLo"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

SELECT cron.schedule(
  'cora-preset-expand-daily',
  '0 3 * * *',
  $$
  SELECT net.http_post(
    url := 'https://uyjryuopuqgmsvayiccl.supabase.co/functions/v1/cora-preset-expand',
    headers := '{"Content-Type": "application/json", "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV5anJ5dW9wdXFnbXN2YXlpY2NsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQyNzU2MzgsImV4cCI6MjA1OTg1MTYzOH0.M828t6sJxh4lZAVACqpRosoRvW_VibHDAMSXV-3WrLo"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
