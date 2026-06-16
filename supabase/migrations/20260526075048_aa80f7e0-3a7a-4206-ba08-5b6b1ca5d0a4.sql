
-- ============== SALES_AGENT_SETTINGS additions ==============
ALTER TABLE public.sales_agent_settings
  ADD COLUMN IF NOT EXISTS mailbox_address text DEFAULT 'shaun@crunchcarbon.com',
  ADD COLUMN IF NOT EXISTS autopilot_replies boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS reply_confidence_threshold int NOT NULL DEFAULT 80,
  ADD COLUMN IF NOT EXISTS last_inbound_poll_at timestamptz,
  ADD COLUMN IF NOT EXISTS bookings_url text DEFAULT 'https://outlook.office.com/bookwithme/user/9d260efd86dd40d586655ba9b9a3b4c1@crunchcarbon.com/meetingtype/NFYHu93970W7f_fhSJejcg2?anonymous&ismsaljsauthenabled&ep=mlink',
  ADD COLUMN IF NOT EXISTS bookings_cta_label text DEFAULT 'Pick a 30-min slot with Shaun',
  ADD COLUMN IF NOT EXISTS meeting_timezone text DEFAULT 'Africa/Johannesburg',
  ADD COLUMN IF NOT EXISTS notify_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_email text DEFAULT 'shaun@crunchcarbon.com',
  ADD COLUMN IF NOT EXISTS notify_pending_threshold int NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS notify_inbox_threshold int NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS notify_stuck_hours int NOT NULL DEFAULT 72,
  ADD COLUMN IF NOT EXISTS notify_quiet_hours jsonb DEFAULT '{"start":"18:00","end":"07:00","tz":"Africa/Johannesburg"}'::jsonb,
  ADD COLUMN IF NOT EXISTS notify_min_interval_hours int NOT NULL DEFAULT 6,
  ADD COLUMN IF NOT EXISTS notify_daily_digest boolean NOT NULL DEFAULT true;

-- ============== INBOUND_MESSAGES ==============
CREATE TABLE IF NOT EXISTS public.inbound_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id uuid,
  lead_id uuid,
  graph_message_id text NOT NULL UNIQUE,
  conversation_id text,
  from_email text NOT NULL,
  from_name text,
  subject text,
  body_text text,
  body_html text,
  headers jsonb DEFAULT '{}'::jsonb,
  intent text,
  confidence int,
  received_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_inbound_messages_enrollment ON public.inbound_messages(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_inbound_messages_lead ON public.inbound_messages(lead_id);
CREATE INDEX IF NOT EXISTS idx_inbound_messages_conversation ON public.inbound_messages(conversation_id);
ALTER TABLE public.inbound_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage inbound_messages" ON public.inbound_messages
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Service role manages inbound_messages" ON public.inbound_messages
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============== OUTREACH_REPLIES ==============
CREATE TABLE IF NOT EXISTS public.outreach_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id uuid,
  lead_id uuid,
  inbound_message_id uuid REFERENCES public.inbound_messages(id) ON DELETE SET NULL,
  draft_body text,
  sent_body text,
  status text NOT NULL DEFAULT 'draft', -- draft|sent|discarded
  authored_by text NOT NULL DEFAULT 'ai', -- ai|admin
  graph_message_id text,
  reviewed_by uuid,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_outreach_replies_enrollment ON public.outreach_replies(enrollment_id);
ALTER TABLE public.outreach_replies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage outreach_replies" ON public.outreach_replies
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Service role manages outreach_replies" ON public.outreach_replies
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============== MEETINGS ==============
CREATE TABLE IF NOT EXISTS public.meetings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid,
  enrollment_id uuid,
  candidate_id uuid,
  scheduled_at timestamptz NOT NULL,
  duration_min int NOT NULL DEFAULT 30,
  teams_join_url text,
  source text NOT NULL DEFAULT 'ms_bookings',
  raw_confirmation_message_id uuid REFERENCES public.inbound_messages(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'scheduled', -- scheduled|held|no_show|cancelled
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_meetings_lead ON public.meetings(lead_id);
CREATE INDEX IF NOT EXISTS idx_meetings_scheduled_at ON public.meetings(scheduled_at);
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage meetings" ON public.meetings
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Service role manages meetings" ON public.meetings
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============== SCORE_HISTORY ==============
CREATE TABLE IF NOT EXISTS public.score_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL,
  old_score int,
  new_score int NOT NULL,
  reason text NOT NULL, -- edit|enrichment|manual|trigger
  changed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_score_history_candidate ON public.score_history(candidate_id, created_at DESC);
ALTER TABLE public.score_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read score_history" ON public.score_history
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Service role manages score_history" ON public.score_history
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============== NOTIFICATION_STATE ==============
CREATE TABLE IF NOT EXISTS public.notification_state (
  event_key text PRIMARY KEY,
  last_sent_at timestamptz,
  last_count int,
  meta jsonb DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.notification_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read notification_state" ON public.notification_state
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Service role manages notification_state" ON public.notification_state
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============== CANDIDATE_NOTES ==============
CREATE TABLE IF NOT EXISTS public.candidate_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid,
  lead_id uuid,
  author_id uuid,
  author_role text NOT NULL DEFAULT 'admin', -- admin|ai|system|inbound
  kind text NOT NULL DEFAULT 'comment', -- comment|inbound|outbound|system_event
  body text NOT NULL,
  mentioned_users uuid[] DEFAULT '{}',
  meta jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_candidate_notes_candidate ON public.candidate_notes(candidate_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_candidate_notes_lead ON public.candidate_notes(lead_id, created_at DESC);
ALTER TABLE public.candidate_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage candidate_notes" ON public.candidate_notes
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Service role manages candidate_notes" ON public.candidate_notes
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============== SCORING FUNCTION + TRIGGER ==============
CREATE OR REPLACE FUNCTION public.compute_candidate_score(_candidate_id uuid)
RETURNS int
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r public.discovery_candidates%ROWTYPE;
  s int := 0;
BEGIN
  SELECT * INTO r FROM public.discovery_candidates WHERE id = _candidate_id;
  IF NOT FOUND THEN RETURN 0; END IF;
  IF r.email IS NOT NULL AND length(r.email) > 3 THEN s := s + 35; END IF;
  IF r.website IS NOT NULL AND length(r.website) > 3 THEN s := s + 20; END IF;
  IF r.phone IS NOT NULL AND length(r.phone) > 3 THEN s := s + 15; END IF;
  IF r.contact_name IS NOT NULL AND length(r.contact_name) > 1 THEN s := s + 15; END IF;
  IF r.enrichment IS NOT NULL AND jsonb_typeof(r.enrichment) = 'object' AND (r.enrichment <> '{}'::jsonb) THEN s := s + 15; END IF;
  RETURN LEAST(s, 100);
END;
$$;

CREATE OR REPLACE FUNCTION public.discovery_candidates_rescore_fn()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_score int;
BEGIN
  -- Only recompute on relevant column changes
  IF (NEW.email IS DISTINCT FROM OLD.email)
     OR (NEW.website IS DISTINCT FROM OLD.website)
     OR (NEW.phone IS DISTINCT FROM OLD.phone)
     OR (NEW.contact_name IS DISTINCT FROM OLD.contact_name)
     OR (NEW.enrichment IS DISTINCT FROM OLD.enrichment)
     OR (NEW.location IS DISTINCT FROM OLD.location) THEN
    -- Inline compute to avoid recursive SELECT
    new_score := 0;
    IF NEW.email IS NOT NULL AND length(NEW.email) > 3 THEN new_score := new_score + 35; END IF;
    IF NEW.website IS NOT NULL AND length(NEW.website) > 3 THEN new_score := new_score + 20; END IF;
    IF NEW.phone IS NOT NULL AND length(NEW.phone) > 3 THEN new_score := new_score + 15; END IF;
    IF NEW.contact_name IS NOT NULL AND length(NEW.contact_name) > 1 THEN new_score := new_score + 15; END IF;
    IF NEW.enrichment IS NOT NULL AND jsonb_typeof(NEW.enrichment) = 'object' AND (NEW.enrichment <> '{}'::jsonb) THEN new_score := new_score + 15; END IF;
    new_score := LEAST(new_score, 100);
    IF new_score IS DISTINCT FROM OLD.score THEN
      NEW.score := new_score;
      INSERT INTO public.score_history (candidate_id, old_score, new_score, reason, changed_by)
      VALUES (NEW.id, OLD.score, new_score, 'edit', auth.uid());
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS discovery_candidates_rescore_trg ON public.discovery_candidates;
CREATE TRIGGER discovery_candidates_rescore_trg
  BEFORE UPDATE ON public.discovery_candidates
  FOR EACH ROW EXECUTE FUNCTION public.discovery_candidates_rescore_fn();

CREATE OR REPLACE FUNCTION public.rescore_pending_candidates()
RETURNS TABLE(candidate_id uuid, old_score int, new_score int)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
  ns int;
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  FOR r IN SELECT id, score FROM public.discovery_candidates WHERE status = 'pending' LOOP
    ns := public.compute_candidate_score(r.id);
    IF ns IS DISTINCT FROM r.score THEN
      UPDATE public.discovery_candidates SET score = ns WHERE id = r.id;
      INSERT INTO public.score_history (candidate_id, old_score, new_score, reason, changed_by)
      VALUES (r.id, r.score, ns, 'manual', auth.uid());
      candidate_id := r.id; old_score := r.score; new_score := ns;
      RETURN NEXT;
    END IF;
  END LOOP;
END;
$$;

-- updated_at triggers
CREATE OR REPLACE FUNCTION public.set_updated_at_phase3()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS outreach_replies_updated_at ON public.outreach_replies;
CREATE TRIGGER outreach_replies_updated_at BEFORE UPDATE ON public.outreach_replies
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_phase3();

DROP TRIGGER IF EXISTS meetings_updated_at ON public.meetings;
CREATE TRIGGER meetings_updated_at BEFORE UPDATE ON public.meetings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_phase3();
