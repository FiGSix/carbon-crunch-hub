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
  v_submitter uuid;
  v_jwt_role text := coalesce(current_setting('request.jwt.claim.role', true), '');
BEGIN
  v_submitter := auth.uid();
  IF v_submitter IS NULL AND v_jwt_role = 'service_role' THEN v_submitter := p_agent_id; END IF;
  IF v_submitter IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF p_agent_id IS DISTINCT FROM v_submitter
     AND v_jwt_role <> 'service_role'
     AND NOT public.has_role(v_submitter, 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Cannot submit a review for another user';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(concat_ws('|', p_client_id::text, public.normalize_project_identity(p_title), round(coalesce(p_system_size_kwp,0),1)::text), 0));
  SELECT * INTO v_match FROM public.find_high_confidence_proposal_duplicate(p_client_id,p_title,p_address,p_system_size_kwp,p_latitude,p_longitude,NULL);
  IF v_match.proposal_id IS NULL THEN RETURN jsonb_build_object('blocked', false); END IF;
  SELECT id INTO v_review_id FROM public.proposal_duplicate_reviews
   WHERE submitted_by = v_submitter AND matched_proposal_id = v_match.proposal_id
     AND public.normalize_project_identity(proposed_title) = public.normalize_project_identity(p_title)
     AND status = 'pending' ORDER BY created_at DESC LIMIT 1;
  IF v_review_id IS NULL THEN
    INSERT INTO public.proposal_duplicate_reviews(submitted_by,submitting_agent_id,matched_proposal_id,proposed_client_id,proposed_title,proposed_address,proposed_system_size_kwp,proposed_commissioning_date,proposed_payload,match_reasons,match_score)
    VALUES(v_submitter,p_agent_id,v_match.proposal_id,p_client_id,p_title,p_address,p_system_size_kwp,p_commissioning_date,coalesce(p_payload,'{}'::jsonb),v_match.match_reasons,v_match.match_score)
    RETURNING id INTO v_review_id;
  END IF;
  RETURN jsonb_build_object('blocked', true, 'review_id', v_review_id, 'match_reasons', v_match.match_reasons);
END;
$$;
REVOKE ALL ON FUNCTION public.queue_proposal_duplicate_review(uuid,uuid,text,text,numeric,date,numeric,numeric,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.queue_proposal_duplicate_review(uuid,uuid,text,text,numeric,date,numeric,numeric,jsonb) TO authenticated, service_role;