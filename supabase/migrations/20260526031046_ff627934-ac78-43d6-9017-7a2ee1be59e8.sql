
-- Blocklist table
CREATE TABLE IF NOT EXISTS public.discovery_blocklist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name_normalized text,
  domain text,
  reason text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT discovery_blocklist_unique UNIQUE NULLS NOT DISTINCT (company_name_normalized, domain)
);

ALTER TABLE public.discovery_blocklist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage discovery_blocklist"
  ON public.discovery_blocklist FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role manages discovery_blocklist"
  ON public.discovery_blocklist FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_discovery_blocklist_domain ON public.discovery_blocklist (domain);
CREATE INDEX IF NOT EXISTS idx_discovery_blocklist_company ON public.discovery_blocklist (company_name_normalized);

-- Queue index
CREATE INDEX IF NOT EXISTS idx_discovery_candidates_pending
  ON public.discovery_candidates (status, score DESC, created_at DESC);

-- Helper: extract domain from email or website
CREATE OR REPLACE FUNCTION public.extract_domain(_email text, _website text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT lower(
    CASE
      WHEN _email IS NOT NULL AND position('@' in _email) > 0
        THEN split_part(_email, '@', 2)
      WHEN _website IS NOT NULL
        THEN regexp_replace(regexp_replace(_website, '^https?://(www\.)?', ''), '/.*$', '')
      ELSE NULL
    END
  );
$$;

-- Promote candidate -> agent lead (+ optional auto-enroll)
CREATE OR REPLACE FUNCTION public.promote_discovery_candidate(_candidate_id uuid)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  c public.discovery_candidates%ROWTYPE;
  s public.sales_agent_settings%ROWTYPE;
  new_lead_id uuid;
  cand_domain text;
  caller uuid := auth.uid();
  auto_flag boolean;
BEGIN
  IF caller IS NOT NULL AND NOT has_role(caller, 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admins can promote candidates';
  END IF;

  SELECT * INTO c FROM public.discovery_candidates WHERE id = _candidate_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Candidate not found'; END IF;
  IF c.status NOT IN ('pending') THEN
    RAISE EXCEPTION 'Candidate is not pending (status=%)', c.status;
  END IF;

  SELECT * INTO s FROM public.sales_agent_settings WHERE id = true;

  INSERT INTO public.agent_leads (
    company_name, contact_name, email, phone, website, location, notes,
    source, status, created_by
  ) VALUES (
    c.company_name, c.contact_name, c.email, c.phone, c.website, c.location,
    coalesce(c.enrichment->>'notes', null),
    'ai-discovery:' || coalesce(c.run_id::text, 'manual'),
    'new',
    caller
  )
  RETURNING id INTO new_lead_id;

  -- Decide approved vs auto_promoted based on whether autopilot is on AND score qualifies
  auto_flag := (s.autopilot_discovery IS TRUE AND c.score >= coalesce(s.score_threshold, 60));

  UPDATE public.discovery_candidates
  SET status = CASE WHEN auto_flag THEN 'auto_promoted' ELSE 'approved' END,
      reviewed_at = now(),
      reviewed_by = caller,
      created_lead_id = new_lead_id
  WHERE id = _candidate_id;

  -- Optional auto-enrollment
  cand_domain := public.extract_domain(c.email, c.website);
  IF s.autopilot_outreach IS TRUE
     AND c.email IS NOT NULL
     AND s.default_sequence_id IS NOT NULL
     AND (cand_domain IS NULL OR NOT (cand_domain = ANY (coalesce(s.blocked_domains, ARRAY[]::text[]))))
  THEN
    INSERT INTO public.outreach_enrollments (lead_id, sequence_id, current_step, next_send_at, status, enrolled_by)
    VALUES (new_lead_id, s.default_sequence_id, 0, now() + (floor(random() * 600) || ' seconds')::interval, 'active', caller);
  END IF;

  RETURN new_lead_id;
END;
$$;

-- Reject candidate -> blocklist
CREATE OR REPLACE FUNCTION public.reject_discovery_candidate(_candidate_id uuid, _reason text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  c public.discovery_candidates%ROWTYPE;
  cand_domain text;
  cand_company text;
  caller uuid := auth.uid();
BEGIN
  IF caller IS NOT NULL AND NOT has_role(caller, 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admins can reject candidates';
  END IF;

  SELECT * INTO c FROM public.discovery_candidates WHERE id = _candidate_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Candidate not found'; END IF;

  UPDATE public.discovery_candidates
  SET status = 'rejected', reviewed_at = now(), reviewed_by = caller
  WHERE id = _candidate_id;

  cand_domain := public.extract_domain(c.email, c.website);
  cand_company := lower(trim(c.company_name));

  INSERT INTO public.discovery_blocklist (company_name_normalized, domain, reason, created_by)
  VALUES (cand_company, cand_domain, _reason, caller)
  ON CONFLICT DO NOTHING;
END;
$$;

GRANT EXECUTE ON FUNCTION public.promote_discovery_candidate(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_discovery_candidate(uuid, text) TO authenticated;
