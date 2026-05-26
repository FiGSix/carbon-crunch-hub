
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

SELECT cron.schedule(
  'poll-inbound-every-5-min',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url:='https://uyjryuopuqgmsvayiccl.supabase.co/functions/v1/poll-inbound',
    headers:='{"Content-Type": "application/json", "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV5anJ5dW9wdXFnbXN2YXlpY2NsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQyNzU2MzgsImV4cCI6MjA1OTg1MTYzOH0.M828t6sJxh4lZAVACqpRosoRvW_VibHDAMSXV-3WrLo"}'::jsonb,
    body:=concat('{"trigger":"cron","at":"', now(), '"}')::jsonb
  );
  $$
);

SELECT cron.schedule(
  'sales-agent-notify-every-15-min',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url:='https://uyjryuopuqgmsvayiccl.supabase.co/functions/v1/sales-agent-notify',
    headers:='{"Content-Type": "application/json", "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV5anJ5dW9wdXFnbXN2YXlpY2NsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQyNzU2MzgsImV4cCI6MjA1OTg1MTYzOH0.M828t6sJxh4lZAVACqpRosoRvW_VibHDAMSXV-3WrLo"}'::jsonb,
    body:=concat('{"trigger":"cron","at":"', now(), '"}')::jsonb
  );
  $$
);
