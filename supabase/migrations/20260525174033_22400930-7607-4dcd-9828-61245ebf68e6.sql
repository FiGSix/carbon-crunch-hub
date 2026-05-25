
-- AI SALES AGENT - Phase 1 Schema
CREATE TABLE public.sales_agent_settings (
  id boolean PRIMARY KEY DEFAULT true,
  autopilot_discovery boolean NOT NULL DEFAULT false,
  autopilot_outreach boolean NOT NULL DEFAULT false,
  daily_send_cap integer NOT NULL DEFAULT 50,
  quiet_hours_start smallint NOT NULL DEFAULT 20,
  quiet_hours_end smallint NOT NULL DEFAULT 8,
  score_threshold integer NOT NULL DEFAULT 60,
  blocked_domains text[] NOT NULL DEFAULT '{}',
  target_regions text[] NOT NULL DEFAULT '{}',
  default_sequence_id uuid,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid,
  CONSTRAINT single_row CHECK (id = true)
);
ALTER TABLE public.sales_agent_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage sales agent settings" ON public.sales_agent_settings FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TABLE public.discovery_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL,
  query text,
  region text,
  status text NOT NULL DEFAULT 'pending',
  started_at timestamptz,
  completed_at timestamptz,
  leads_found integer NOT NULL DEFAULT 0,
  leads_approved integer NOT NULL DEFAULT 0,
  cost_cents integer NOT NULL DEFAULT 0,
  error text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.discovery_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage discovery_runs" ON public.discovery_runs FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Service role inserts discovery_runs" ON public.discovery_runs FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "Service role updates discovery_runs" ON public.discovery_runs FOR UPDATE TO service_role USING (true);
CREATE INDEX idx_discovery_runs_status ON public.discovery_runs(status);
CREATE INDEX idx_discovery_runs_created_at ON public.discovery_runs(created_at DESC);

CREATE TABLE public.discovery_candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES public.discovery_runs(id) ON DELETE CASCADE,
  company_name text NOT NULL,
  website text,
  email text,
  contact_name text,
  phone text,
  location text,
  score integer NOT NULL DEFAULT 0,
  enrichment jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending',
  dedup_match_id uuid,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_lead_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.discovery_candidates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage discovery_candidates" ON public.discovery_candidates FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Service role inserts discovery_candidates" ON public.discovery_candidates FOR INSERT TO service_role WITH CHECK (true);
CREATE INDEX idx_discovery_candidates_run ON public.discovery_candidates(run_id);
CREATE INDEX idx_discovery_candidates_status ON public.discovery_candidates(status);
CREATE INDEX idx_discovery_candidates_score ON public.discovery_candidates(score DESC);

CREATE TABLE public.outreach_sequences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  steps jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.outreach_sequences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage outreach_sequences" ON public.outreach_sequences FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TABLE public.outreach_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.agent_leads(id) ON DELETE CASCADE,
  sequence_id uuid NOT NULL REFERENCES public.outreach_sequences(id) ON DELETE RESTRICT,
  current_step integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active',
  next_send_at timestamptz,
  paused_reason text,
  enrolled_by uuid,
  enrolled_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  UNIQUE (lead_id, sequence_id)
);
ALTER TABLE public.outreach_enrollments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage outreach_enrollments" ON public.outreach_enrollments FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Service role manages outreach_enrollments" ON public.outreach_enrollments FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE INDEX idx_outreach_enrollments_next_send ON public.outreach_enrollments(next_send_at) WHERE status = 'active';
CREATE INDEX idx_outreach_enrollments_lead ON public.outreach_enrollments(lead_id);

CREATE TABLE public.sales_agent_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name text NOT NULL,
  status text NOT NULL DEFAULT 'running',
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  stats jsonb NOT NULL DEFAULT '{}'::jsonb,
  error text
);
ALTER TABLE public.sales_agent_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view sales_agent_runs" ON public.sales_agent_runs FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Service role writes sales_agent_runs" ON public.sales_agent_runs FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE INDEX idx_sales_agent_runs_job ON public.sales_agent_runs(job_name, started_at DESC);

-- FUNNEL VIEW (profiles.id IS the auth user id)
CREATE OR REPLACE VIEW public.v_sales_agent_funnel AS
WITH agent_first_proposal AS (
  SELECT p.agent_id, MIN(p.created_at) AS first_proposal_at, COUNT(*) AS proposal_count
  FROM public.proposals p
  WHERE p.agent_id IS NOT NULL
  GROUP BY p.agent_id
)
SELECT
  l.id AS lead_id,
  l.company_name,
  l.email,
  l.status AS lead_status,
  l.created_at AS discovered_at,
  l.last_outreach_at,
  l.outreach_count,
  l.converted_at,
  i.id AS invitation_id,
  i.created_at AS invited_at,
  i.status AS invite_status,
  i.accepted_at,
  pr.id AS agent_user_id,
  afp.first_proposal_at,
  COALESCE(afp.proposal_count, 0) AS proposal_count,
  CASE
    WHEN afp.first_proposal_at IS NOT NULL THEN 'first_proposal_sent'
    WHEN i.accepted_at IS NOT NULL THEN 'signed_up'
    WHEN i.id IS NOT NULL THEN 'invited'
    WHEN l.status = 'qualified' THEN 'replied'
    WHEN l.outreach_count > 0 THEN 'contacted'
    ELSE 'discovered'
  END AS funnel_stage
FROM public.agent_leads l
LEFT JOIN public.agent_invitations i ON i.id = l.converted_invitation_id
LEFT JOIN public.profiles pr ON LOWER(pr.email) = LOWER(i.email)
LEFT JOIN agent_first_proposal afp ON afp.agent_id = pr.id;

GRANT SELECT ON public.v_sales_agent_funnel TO authenticated;

INSERT INTO public.sales_agent_settings (id) VALUES (true) ON CONFLICT DO NOTHING;

INSERT INTO public.outreach_sequences (name, description, is_active, steps) VALUES (
  'EPC Cold Outreach v1',
  'Default 3-touch cold sequence for newly discovered EPCs (day 0, 3, 7).',
  true,
  '[
    {"day_offset":0,"subject":"Quick question about {{company_name}}","body_template":"Hi {{first_name}},\n\nI came across {{company_name}} while looking at solar EPCs in {{location}}. We help installers like you turn already-built solar projects into recurring carbon-credit revenue for your clients — no extra hardware, no upfront cost.\n\nWorth a 15-min call to see if it fits?\n\nBest,\nThe Crunch Carbon Team","cta_label":"Book a call","cta_url":"https://crunchcarbon.com/contact"},
    {"day_offset":3,"subject":"Re: Quick question about {{company_name}}","body_template":"Hi {{first_name}},\n\nFollowing up — most of the EPCs we work with add 5-15% extra revenue per project by including carbon credits in their proposals.\n\nHappy to share a 2-minute overview if useful. Want me to send it?\n\nBest,\nThe Crunch Carbon Team","cta_label":"Send overview","cta_url":"https://crunchcarbon.com/contact"},
    {"day_offset":7,"subject":"Last one — {{company_name}} + carbon credits","body_template":"Hi {{first_name}},\n\nI''ll stop following up after this. If recurring revenue from your existing solar installs ever becomes a priority, we''re here.\n\nIn the meantime — wishing you a great quarter.\n\nBest,\nThe Crunch Carbon Team","cta_label":"Learn more","cta_url":"https://crunchcarbon.com"}
  ]'::jsonb
);

UPDATE public.sales_agent_settings
SET default_sequence_id = (SELECT id FROM public.outreach_sequences ORDER BY created_at LIMIT 1)
WHERE id = true;

CREATE TRIGGER trg_sales_agent_settings_updated BEFORE UPDATE ON public.sales_agent_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_outreach_sequences_updated BEFORE UPDATE ON public.outreach_sequences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
