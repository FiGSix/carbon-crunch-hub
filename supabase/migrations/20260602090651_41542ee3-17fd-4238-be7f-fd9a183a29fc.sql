
-- Unschedule sales-agent / cora / discovery cron jobs
DO $$
DECLARE
  j RECORD;
BEGIN
  FOR j IN
    SELECT jobid FROM cron.job
    WHERE jobname IN (
      'poll-inbound-every-5-min',
      'sales-agent-notify-every-15-min',
      'discovery-daily',
      'outreach-send-15min',
      'nudge-daily',
      'cora-enrich-every-5-min',
      'discovery-midday',
      'cora-preset-expand-daily'
    )
  LOOP
    PERFORM cron.unschedule(j.jobid);
  END LOOP;
END $$;

-- Drop sales-agent views
DROP VIEW IF EXISTS public.v_outreach_variant_stats CASCADE;
DROP VIEW IF EXISTS public.v_sales_agent_funnel CASCADE;

-- Drop sales-agent tables (CASCADE handles FKs, indexes, policies, RLS, dependent triggers)
DROP TABLE IF EXISTS public.cora_decision_log CASCADE;
DROP TABLE IF EXISTS public.cora_mailbox_status CASCADE;
DROP TABLE IF EXISTS public.cora_recommended_actions CASCADE;
DROP TABLE IF EXISTS public.discovery_blocklist CASCADE;
DROP TABLE IF EXISTS public.outreach_enrollments CASCADE;
DROP TABLE IF EXISTS public.outreach_replies CASCADE;
DROP TABLE IF EXISTS public.outreach_sequences CASCADE;
DROP TABLE IF EXISTS public.outreach_template_variants CASCADE;
DROP TABLE IF EXISTS public.sales_agent_discovery_presets CASCADE;
DROP TABLE IF EXISTS public.sales_agent_runs CASCADE;
DROP TABLE IF EXISTS public.sales_agent_settings CASCADE;
DROP TABLE IF EXISTS public.score_history CASCADE;
DROP TABLE IF EXISTS public.discovery_runs CASCADE;
DROP TABLE IF EXISTS public.discovery_candidates CASCADE;
DROP TABLE IF EXISTS public.lead_outreach_history CASCADE;

-- Drop sales-agent functions
DROP FUNCTION IF EXISTS public.compute_candidate_score(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.discovery_candidates_rescore_fn() CASCADE;
DROP FUNCTION IF EXISTS public.promote_discovery_candidate(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.reject_discovery_candidate(uuid, text) CASCADE;
DROP FUNCTION IF EXISTS public.rescore_pending_candidates() CASCADE;
