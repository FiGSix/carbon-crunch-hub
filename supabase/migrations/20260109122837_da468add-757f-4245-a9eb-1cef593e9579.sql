-- Remove pre-signature automation cron job
SELECT cron.unschedule('proposal-automation-daily');

-- Remove post-signature automation cron job  
SELECT cron.unschedule('post-signature-automation-daily');

-- Note: weekly-roundup-emails is intentionally kept active