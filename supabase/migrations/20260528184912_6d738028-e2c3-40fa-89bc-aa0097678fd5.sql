
ALTER TABLE public.sales_agent_settings
  ADD COLUMN IF NOT EXISTS target_agents int NOT NULL DEFAULT 250,
  ADD COLUMN IF NOT EXISTS goal_topup_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS max_topup_runs_per_day int NOT NULL DEFAULT 4,
  ADD COLUMN IF NOT EXISTS expected_conversion numeric NOT NULL DEFAULT 0.1,
  ADD COLUMN IF NOT EXISTS enrichment_daily_cap int NOT NULL DEFAULT 500,
  ADD COLUMN IF NOT EXISTS completeness_threshold int NOT NULL DEFAULT 80,
  ADD COLUMN IF NOT EXISTS autopilot_enrichment boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS autopilot_preset_expand boolean NOT NULL DEFAULT true;

ALTER TABLE public.sales_agent_discovery_presets
  ADD COLUMN IF NOT EXISTS stale boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS last_yield_count int NOT NULL DEFAULT 0;
