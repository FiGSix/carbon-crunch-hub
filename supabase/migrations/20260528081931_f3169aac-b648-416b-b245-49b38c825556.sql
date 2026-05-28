
-- discovery_candidates: enrichment columns
ALTER TABLE public.discovery_candidates
  ADD COLUMN IF NOT EXISTS lead_segment text,
  ADD COLUMN IF NOT EXISTS fit_score int,
  ADD COLUMN IF NOT EXISTS personalisation_score int,
  ADD COLUMN IF NOT EXISTS research_confidence int,
  ADD COLUMN IF NOT EXISTS cora_summary text,
  ADD COLUMN IF NOT EXISTS research_evidence jsonb,
  ADD COLUMN IF NOT EXISTS best_angle text,
  ADD COLUMN IF NOT EXISTS recommended_cta text,
  ADD COLUMN IF NOT EXISTS last_meaningful_event_at timestamptz,
  ADD COLUMN IF NOT EXISTS next_best_action text,
  ADD COLUMN IF NOT EXISTS next_action_owner text,
  ADD COLUMN IF NOT EXISTS escalation_required boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS escalation_reason text,
  ADD COLUMN IF NOT EXISTS estimated_portfolio_size_mwp numeric,
  ADD COLUMN IF NOT EXISTS priority_score numeric,
  ADD COLUMN IF NOT EXISTS do_not_contact_reason text,
  ADD COLUMN IF NOT EXISTS contact_permission_status text,
  ADD COLUMN IF NOT EXISTS contact_permission_reason text,
  ADD COLUMN IF NOT EXISTS existing_relationship_status text,
  ADD COLUMN IF NOT EXISTS duplicate_check_status text,
  ADD COLUMN IF NOT EXISTS duplicate_match_type text,
  ADD COLUMN IF NOT EXISTS matched_existing_record_id uuid,
  ADD COLUMN IF NOT EXISTS matched_existing_record_type text,
  ADD COLUMN IF NOT EXISTS prompt_version text,
  ADD COLUMN IF NOT EXISTS last_cora_decision_at timestamptz,
  ADD COLUMN IF NOT EXISTS pipeline_stage text;

-- Backfill pipeline_stage from existing status
UPDATE public.discovery_candidates
SET pipeline_stage = CASE
  WHEN status IN ('new','discovered','pending') THEN 'new'
  WHEN status = 'researching' THEN 'researching'
  WHEN status IN ('approved','qualified') THEN 'qualified'
  WHEN status IN ('enrolled','outreach','sent') THEN 'outreach_active'
  WHEN status IN ('replied','engaged') THEN 'engaged'
  WHEN status = 'meeting_booked' THEN 'meeting_booked'
  WHEN status IN ('rejected','not_fit') THEN 'not_fit'
  WHEN status IN ('blocked','do_not_contact','dnc') THEN 'do_not_contact'
  WHEN status = 'duplicate' THEN 'duplicate'
  ELSE COALESCE(status, 'new')
END
WHERE pipeline_stage IS NULL;

CREATE INDEX IF NOT EXISTS idx_discovery_candidates_pipeline_stage ON public.discovery_candidates(pipeline_stage);
CREATE INDEX IF NOT EXISTS idx_discovery_candidates_priority_score ON public.discovery_candidates(priority_score DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_discovery_candidates_last_event ON public.discovery_candidates(last_meaningful_event_at DESC NULLS LAST);

-- lead_outreach_history: outlook tracking
ALTER TABLE public.lead_outreach_history
  ADD COLUMN IF NOT EXISTS sending_mailbox text,
  ADD COLUMN IF NOT EXISTS outlook_message_id text,
  ADD COLUMN IF NOT EXISTS outlook_thread_id text;

-- outreach_replies: outlook tracking
ALTER TABLE public.outreach_replies
  ADD COLUMN IF NOT EXISTS sending_mailbox text,
  ADD COLUMN IF NOT EXISTS outlook_message_id text,
  ADD COLUMN IF NOT EXISTS outlook_thread_id text;

-- sales_agent_settings: autopilot + thresholds
ALTER TABLE public.sales_agent_settings
  ADD COLUMN IF NOT EXISTS autopilot_status text DEFAULT 'assisted',
  ADD COLUMN IF NOT EXISTS pause_all_sending boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS emergency_stop boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS fit_score_threshold int DEFAULT 3,
  ADD COLUMN IF NOT EXISTS personalisation_score_threshold int DEFAULT 2,
  ADD COLUMN IF NOT EXISTS research_confidence_threshold int DEFAULT 70,
  ADD COLUMN IF NOT EXISTS max_auto_approvals_per_day int DEFAULT 50,
  ADD COLUMN IF NOT EXISTS max_auto_enrollments_per_day int DEFAULT 50,
  ADD COLUMN IF NOT EXISTS max_auto_replies_per_day int DEFAULT 50,
  ADD COLUMN IF NOT EXISTS prompt_version text DEFAULT 'v1';

ALTER TABLE public.sales_agent_settings
  ADD CONSTRAINT sales_agent_settings_autopilot_status_check
  CHECK (autopilot_status IN ('off','assisted','full')) NOT VALID;

-- cora_mailbox_status: single-row latest health
CREATE TABLE IF NOT EXISTS public.cora_mailbox_status (
  id boolean PRIMARY KEY DEFAULT true,
  mailbox_address text NOT NULL DEFAULT 'cora@crunchcarbon.com',
  outcome text NOT NULL DEFAULT 'unknown',
  latency_ms int,
  error text,
  checked_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT cora_mailbox_status_singleton CHECK (id = true)
);

GRANT SELECT, INSERT, UPDATE ON public.cora_mailbox_status TO authenticated;
GRANT ALL ON public.cora_mailbox_status TO service_role;

ALTER TABLE public.cora_mailbox_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read mailbox status"
  ON public.cora_mailbox_status FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update mailbox status"
  ON public.cora_mailbox_status FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.cora_mailbox_status (id, outcome) VALUES (true, 'unknown')
ON CONFLICT (id) DO NOTHING;

-- cora_decision_log: append-only autonomous-action log
CREATE TABLE IF NOT EXISTS public.cora_decision_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid,
  lead_id uuid,
  action text NOT NULL,
  reason text,
  data_used jsonb,
  confidence int,
  prompt_version text,
  variant_id uuid,
  sending_mailbox text,
  outlook_message_id text,
  outlook_thread_id text,
  duplicate_check_result jsonb,
  relationship_check_result jsonb,
  status_before text,
  status_after text,
  admin_override boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.cora_decision_log TO authenticated;
GRANT ALL ON public.cora_decision_log TO service_role;

ALTER TABLE public.cora_decision_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read decision log"
  ON public.cora_decision_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_cora_decision_log_candidate ON public.cora_decision_log(candidate_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cora_decision_log_created ON public.cora_decision_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cora_decision_log_action ON public.cora_decision_log(action, created_at DESC);

-- cora_recommended_actions: daily-rebuilt admin to-dos
CREATE TABLE IF NOT EXISTS public.cora_recommended_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid,
  lead_id uuid,
  action_type text NOT NULL,
  title text NOT NULL,
  description text,
  priority int DEFAULT 50,
  resolved boolean DEFAULT false,
  resolved_at timestamptz,
  resolved_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, UPDATE ON public.cora_recommended_actions TO authenticated;
GRANT ALL ON public.cora_recommended_actions TO service_role;

ALTER TABLE public.cora_recommended_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read recommended actions"
  ON public.cora_recommended_actions FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins resolve recommended actions"
  ON public.cora_recommended_actions FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_cora_recommended_actions_open ON public.cora_recommended_actions(resolved, priority DESC, created_at DESC);
