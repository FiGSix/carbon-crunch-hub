ALTER TABLE public.sales_agent_settings
  ADD COLUMN IF NOT EXISTS lead_ingest_allowlist TEXT[] NOT NULL DEFAULT '{}';