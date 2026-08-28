CREATE TABLE public.proposal_duplicate_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submitted_by uuid NOT NULL,
  submitting_agent_id uuid,
  matched_proposal_id uuid NOT NULL REFERENCES public.proposals(id) ON DELETE CASCADE,
  proposed_client_id uuid,
  proposed_title text NOT NULL,
  proposed_address text,
  proposed_system_size_kwp numeric,
  proposed_commissioning_date date,
  proposed_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  match_reasons text[] NOT NULL DEFAULT '{}'::text[],
  match_score integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  decision_reason text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.proposal_duplicate_reviews TO authenticated;
GRANT ALL ON public.proposal_duplicate_reviews TO service_role;
ALTER TABLE public.proposal_duplicate_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage duplicate reviews"
ON public.proposal_duplicate_reviews FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Submitters view own duplicate reviews"
ON public.proposal_duplicate_reviews FOR SELECT TO authenticated
USING (submitted_by = auth.uid());
CREATE POLICY "Submitters create own duplicate reviews"
ON public.proposal_duplicate_reviews FOR INSERT TO authenticated
WITH CHECK (submitted_by = auth.uid());

ALTER TABLE public.proposals
ADD COLUMN duplicate_review_id uuid REFERENCES public.proposal_duplicate_reviews(id) ON DELETE SET NULL;
CREATE INDEX proposal_duplicate_reviews_status_created_idx
ON public.proposal_duplicate_reviews(status, created_at DESC);
CREATE INDEX proposal_duplicate_reviews_match_idx
ON public.proposal_duplicate_reviews(matched_proposal_id, status);

CREATE OR REPLACE FUNCTION public.normalize_project_identity(value text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT trim(regexp_replace(lower(coalesce(value, '')), '[^a-z0-9]+', ' ', 'g'))
$$;

CREATE OR REPLACE FUNCTION public.find_high_confidence_proposal_duplicate(
  p_client_id uuid,
  p_title text,
  p_address text,
  p_system_size_kwp numeric,
  p_latitude numeric DEFAULT NULL,
  p_longitude numeric DEFAULT NULL,
  p_exclude_proposal_id uuid DEFAULT NULL
)
RETURNS TABLE(proposal_id uuid, match_score integer, match_reasons text[])
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH candidate AS (
    SELECT
      p.id,
      public.normalize_project_identity(p.title) = public.normalize_project_identity(p_title)
        AND public.normalize_project_identity(p_title) <> '' AS same_title,
      public.normalize_project_identity(coalesce(
        p.content->'projectInfo'->>'address', p.project_info->>'address'
      )) = public.normalize_project_identity(p_address)
        AND public.normalize_project_identity(p_address) <> '' AS same_address,
      CASE
        WHEN p_system_size_kwp IS NULL THEN false
        ELSE abs(coalesce(
          nullif(p.content->'projectInfo'->>'systemSize', '')::numeric,
          nullif(p.project_info->>'systemSize', '')::numeric,
          p.system_size_kwp
        ) - p_system_size_kwp) <= greatest(0.5, p_system_size_kwp * 0.005)
      END AS same_size,
      CASE
        WHEN p_latitude IS NULL OR p_longitude IS NULL THEN false
        WHEN coalesce(nullif(p.content->'projectInfo'->>'latitude', '')::numeric, nullif(p.project_info->>'latitude', '')::numeric) IS NULL THEN false
        ELSE 6371000 * 2 * asin(sqrt(
          power(sin(radians((coalesce(nullif(p.content->'projectInfo'->>'latitude', '')::numeric, nullif(p.project_info->>'latitude', '')::numeric) - p_latitude) / 2)), 2)
          + cos(radians(p_latitude)) * cos(radians(coalesce(nullif(p.content->'projectInfo'->>'latitude', '')::numeric, nullif(p.project_info->>'latitude', '')::numeric)))
          * power(sin(radians((coalesce(nullif(p.content->'projectInfo'->>'longitude', '')::numeric, nullif(p.project_info->>'longitude', '')::numeric) - p_longitude) / 2)), 2)
        )) <= 500
      END AS nearby,
      (coalesce(p.client_reference_id, p.client_id) = p_client_id) AS same_client
    FROM public.proposals p
    WHERE p.archived_at IS NULL
      AND p.deleted_at IS NULL
      AND (p_exclude_proposal_id IS NULL OR p.id <> p_exclude_proposal_id)
  ), scored AS (
    SELECT id,
      ((same_client::int * 35) + (same_title::int * 30) + (same_size::int * 25) + (same_address::int * 20) + (nearby::int * 10)) AS score,
      array_remove(ARRAY[
        CASE WHEN same_client THEN 'same_client' END,
        CASE WHEN same_title THEN 'same_project_name' END,
        CASE WHEN same_size THEN 'same_system_size' END,
        CASE WHEN same_address THEN 'same_address' END,
        CASE WHEN nearby THEN 'nearby_location' END
      ], NULL) AS reasons
    FROM candidate
    WHERE (same_client AND same_title AND same_size)
       OR (same_client AND same_address AND same_size)
       OR (same_title AND same_address AND same_size)
       OR (same_client AND same_title AND nearby)
  )
  SELECT id, score, reasons FROM scored ORDER BY score DESC, id LIMIT 1
$$;
REVOKE ALL ON FUNCTION public.find_high_confidence_proposal_duplicate(uuid,text,text,numeric,numeric,numeric,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.find_high_confidence_proposal_duplicate(uuid,text,text,numeric,numeric,numeric,uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.queue_proposal_duplicate_review(
  p_agent_id uuid,
  p_client_id uuid,
  p_title text,
  p_address text,
  p_system_size_kwp numeric,
  p_commissioning_date date,
  p_latitude numeric DEFAULT NULL,
  p_longitude numeric DEFAULT NULL,
  p_payload jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_match record;
  v_review_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF p_agent_id IS DISTINCT FROM auth.uid() AND NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Cannot submit a review for another user';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(concat_ws('|', p_client_id::text, public.normalize_project_identity(p_title), round(coalesce(p_system_size_kwp,0),1)::text), 0));
  SELECT * INTO v_match FROM public.find_high_confidence_proposal_duplicate(p_client_id,p_title,p_address,p_system_size_kwp,p_latitude,p_longitude,NULL);
  IF v_match.proposal_id IS NULL THEN RETURN jsonb_build_object('blocked', false); END IF;
  SELECT id INTO v_review_id FROM public.proposal_duplicate_reviews
   WHERE submitted_by = auth.uid() AND matched_proposal_id = v_match.proposal_id
     AND public.normalize_project_identity(proposed_title) = public.normalize_project_identity(p_title)
     AND status = 'pending' ORDER BY created_at DESC LIMIT 1;
  IF v_review_id IS NULL THEN
    INSERT INTO public.proposal_duplicate_reviews(submitted_by,submitting_agent_id,matched_proposal_id,proposed_client_id,proposed_title,proposed_address,proposed_system_size_kwp,proposed_commissioning_date,proposed_payload,match_reasons,match_score)
    VALUES(auth.uid(),p_agent_id,v_match.proposal_id,p_client_id,p_title,p_address,p_system_size_kwp,p_commissioning_date,coalesce(p_payload,'{}'::jsonb),v_match.match_reasons,v_match.match_score)
    RETURNING id INTO v_review_id;
  END IF;
  RETURN jsonb_build_object('blocked', true, 'review_id', v_review_id, 'match_reasons', v_match.match_reasons);
END;
$$;
REVOKE ALL ON FUNCTION public.queue_proposal_duplicate_review(uuid,uuid,text,text,numeric,date,numeric,numeric,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.queue_proposal_duplicate_review(uuid,uuid,text,text,numeric,date,numeric,numeric,jsonb) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.decide_proposal_duplicate_review(p_review_id uuid, p_decision text, p_reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN RAISE EXCEPTION 'Admin access required'; END IF;
  IF p_decision NOT IN ('approved_separate','rejected_duplicate') THEN RAISE EXCEPTION 'Invalid decision'; END IF;
  IF nullif(trim(p_reason),'') IS NULL THEN RAISE EXCEPTION 'A decision reason is required'; END IF;
  UPDATE public.proposal_duplicate_reviews
  SET status=p_decision, decision_reason=trim(p_reason), reviewed_by=auth.uid(), reviewed_at=now(), updated_at=now()
  WHERE id=p_review_id AND status='pending';
  IF NOT FOUND THEN RAISE EXCEPTION 'Pending review not found'; END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.decide_proposal_duplicate_review(uuid,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.decide_proposal_duplicate_review(uuid,text,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.decide_proposal_duplicate_review(uuid,text,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.enforce_proposal_duplicate_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client uuid := coalesce(NEW.client_reference_id, NEW.client_id);
  v_address text := coalesce(NEW.content->'projectInfo'->>'address', NEW.project_info->>'address');
  v_size numeric := coalesce(nullif(NEW.content->'projectInfo'->>'systemSize','')::numeric, nullif(NEW.project_info->>'systemSize','')::numeric, NEW.system_size_kwp);
  v_lat numeric := coalesce(nullif(NEW.content->'projectInfo'->>'latitude','')::numeric, nullif(NEW.project_info->>'latitude','')::numeric);
  v_lng numeric := coalesce(nullif(NEW.content->'projectInfo'->>'longitude','')::numeric, nullif(NEW.project_info->>'longitude','')::numeric);
  v_match record;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(concat_ws('|', v_client::text, public.normalize_project_identity(NEW.title), round(coalesce(v_size,0),1)::text), 0));
  SELECT * INTO v_match FROM public.find_high_confidence_proposal_duplicate(v_client,NEW.title,v_address,v_size,v_lat,v_lng,NULL);
  IF v_match.proposal_id IS NOT NULL THEN
    IF NEW.duplicate_review_id IS NULL OR NOT EXISTS (
      SELECT 1 FROM public.proposal_duplicate_reviews r
      WHERE r.id=NEW.duplicate_review_id AND r.status='approved_separate'
        AND r.matched_proposal_id=v_match.proposal_id
        AND r.submitting_agent_id IS NOT DISTINCT FROM NEW.agent_id
    ) THEN
      RAISE EXCEPTION USING ERRCODE='P0001', MESSAGE='DUPLICATE_REVIEW_REQUIRED';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.enforce_proposal_duplicate_guard() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER enforce_proposal_duplicate_guard_before_insert
BEFORE INSERT ON public.proposals
FOR EACH ROW EXECUTE FUNCTION public.enforce_proposal_duplicate_guard();

CREATE OR REPLACE FUNCTION public.set_duplicate_review_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$ BEGIN NEW.updated_at=now(); RETURN NEW; END $$;
CREATE TRIGGER set_proposal_duplicate_reviews_updated_at
BEFORE UPDATE ON public.proposal_duplicate_reviews
FOR EACH ROW EXECUTE FUNCTION public.set_duplicate_review_updated_at();