
CREATE TABLE IF NOT EXISTS public.agent_weekly_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID NOT NULL,
  snapshot_date DATE NOT NULL,
  audit_ready_mwp NUMERIC NOT NULL DEFAULT 0,
  onboarding_mwp NUMERIC NOT NULL DEFAULT 0,
  pending_signature_mwp NUMERIC NOT NULL DEFAULT 0,
  signed_this_week_mwp NUMERIC NOT NULL DEFAULT 0,
  new_proposals_count INTEGER NOT NULL DEFAULT 0,
  estimated_commission_2026 NUMERIC NOT NULL DEFAULT 0,
  estimated_commission_2025_2030 NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT agent_weekly_snapshots_unique UNIQUE (agent_id, snapshot_date)
);

CREATE INDEX IF NOT EXISTS idx_agent_weekly_snapshots_agent_date
  ON public.agent_weekly_snapshots (agent_id, snapshot_date DESC);

ALTER TABLE public.agent_weekly_snapshots ENABLE ROW LEVEL SECURITY;

-- Admins can read all snapshots (uses existing has_role helper)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'has_role'
  ) THEN
    EXECUTE $p$
      CREATE POLICY "Admins can view agent weekly snapshots"
      ON public.agent_weekly_snapshots
      FOR SELECT
      TO authenticated
      USING (public.has_role(auth.uid(), 'admin'));
    $p$;
  END IF;
END $$;
