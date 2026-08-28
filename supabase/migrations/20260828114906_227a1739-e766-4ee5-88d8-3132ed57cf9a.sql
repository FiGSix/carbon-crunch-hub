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
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  WITH candidate AS (
    SELECT p.id,
      public.normalize_project_identity(p.title)=public.normalize_project_identity(p_title) AND public.normalize_project_identity(p_title)<>'' AS same_title,
      public.normalize_project_identity(coalesce(p.content->'projectInfo'->>'address',p.project_info->>'address'))=public.normalize_project_identity(p_address) AND public.normalize_project_identity(p_address)<>'' AS same_address,
      CASE WHEN p_system_size_kwp IS NULL THEN false ELSE abs(coalesce(nullif(p.content->'projectInfo'->>'systemSize','')::numeric,nullif(p.content->'projectInfo'->>'size','')::numeric,nullif(p.project_info->>'systemSize','')::numeric,nullif(p.project_info->>'size','')::numeric,p.system_size_kwp)-p_system_size_kwp)<=greatest(0.5,p_system_size_kwp*0.005) END AS same_size,
      CASE WHEN p_latitude IS NULL OR p_longitude IS NULL THEN false
        WHEN coalesce(nullif(p.content->'projectInfo'->>'gpsLat','')::numeric,nullif(p.project_info->>'gpsLat','')::numeric) IS NULL THEN false
        ELSE 6371000*2*asin(sqrt(power(sin(radians((coalesce(nullif(p.content->'projectInfo'->>'gpsLat','')::numeric,nullif(p.project_info->>'gpsLat','')::numeric)-p_latitude)/2)),2)+cos(radians(p_latitude))*cos(radians(coalesce(nullif(p.content->'projectInfo'->>'gpsLat','')::numeric,nullif(p.project_info->>'gpsLat','')::numeric)))*power(sin(radians((coalesce(nullif(p.content->'projectInfo'->>'gpsLng','')::numeric,nullif(p.project_info->>'gpsLng','')::numeric)-p_longitude)/2)),2)))<=500 END AS nearby,
      coalesce(p.client_reference_id,p.client_id)=p_client_id AS same_client
    FROM public.proposals p WHERE p.archived_at IS NULL AND p.deleted_at IS NULL AND (p_exclude_proposal_id IS NULL OR p.id<>p_exclude_proposal_id)
  ), scored AS (
    SELECT id,((same_client::int*35)+(same_title::int*30)+(same_size::int*25)+(same_address::int*20)+(nearby::int*10)) score,
      array_remove(ARRAY[CASE WHEN same_client THEN 'same_client' END,CASE WHEN same_title THEN 'same_project_name' END,CASE WHEN same_size THEN 'same_system_size' END,CASE WHEN same_address THEN 'same_address' END,CASE WHEN nearby THEN 'nearby_location' END],NULL) reasons
    FROM candidate WHERE (same_client AND same_title AND same_size) OR (same_client AND same_address AND same_size) OR (same_title AND same_address AND same_size) OR (same_client AND same_title AND nearby)
  ) SELECT id,score,reasons FROM scored ORDER BY score DESC,id LIMIT 1
$$;
REVOKE ALL ON FUNCTION public.find_high_confidence_proposal_duplicate(uuid,text,text,numeric,numeric,numeric,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.find_high_confidence_proposal_duplicate(uuid,text,text,numeric,numeric,numeric,uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.queue_proposal_duplicate_review(p_agent_id uuid,p_client_id uuid,p_title text,p_address text,p_system_size_kwp numeric,p_commissioning_date date,p_latitude numeric DEFAULT NULL,p_longitude numeric DEFAULT NULL,p_payload jsonb DEFAULT '{}'::jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_match record; v_review_id uuid; v_submitter uuid; v_jwt_role text:=coalesce(current_setting('request.jwt.claim.role',true),'');
BEGIN
 v_submitter:=auth.uid(); IF v_submitter IS NULL AND v_jwt_role='service_role' THEN v_submitter:=p_agent_id; END IF;
 IF v_submitter IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
 IF p_agent_id IS DISTINCT FROM v_submitter AND v_jwt_role<>'service_role' AND NOT public.has_role(v_submitter,'admin'::public.app_role) THEN RAISE EXCEPTION 'Cannot submit a review for another user'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(concat_ws('|',p_client_id::text,public.normalize_project_identity(p_title),round(coalesce(p_system_size_kwp,0),1)::text),0));
 SELECT * INTO v_match FROM public.find_high_confidence_proposal_duplicate(p_client_id,p_title,p_address,p_system_size_kwp,p_latitude,p_longitude,NULL);
 IF v_match.proposal_id IS NULL THEN RETURN jsonb_build_object('blocked',false); END IF;
 SELECT id INTO v_review_id FROM public.proposal_duplicate_reviews WHERE submitted_by=v_submitter AND matched_proposal_id=v_match.proposal_id AND public.normalize_project_identity(proposed_title)=public.normalize_project_identity(p_title) AND status='approved_separate' ORDER BY reviewed_at DESC LIMIT 1;
 IF v_review_id IS NOT NULL THEN RETURN jsonb_build_object('blocked',false,'approved_review_id',v_review_id); END IF;
 SELECT id INTO v_review_id FROM public.proposal_duplicate_reviews WHERE submitted_by=v_submitter AND matched_proposal_id=v_match.proposal_id AND public.normalize_project_identity(proposed_title)=public.normalize_project_identity(p_title) AND status='pending' ORDER BY created_at DESC LIMIT 1;
 IF v_review_id IS NULL THEN INSERT INTO public.proposal_duplicate_reviews(submitted_by,submitting_agent_id,matched_proposal_id,proposed_client_id,proposed_title,proposed_address,proposed_system_size_kwp,proposed_commissioning_date,proposed_payload,match_reasons,match_score) VALUES(v_submitter,p_agent_id,v_match.proposal_id,p_client_id,p_title,p_address,p_system_size_kwp,p_commissioning_date,coalesce(p_payload,'{}'::jsonb),v_match.match_reasons,v_match.match_score) RETURNING id INTO v_review_id; END IF;
 RETURN jsonb_build_object('blocked',true,'review_id',v_review_id,'match_reasons',v_match.match_reasons);
END $$;
REVOKE ALL ON FUNCTION public.queue_proposal_duplicate_review(uuid,uuid,text,text,numeric,date,numeric,numeric,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.queue_proposal_duplicate_review(uuid,uuid,text,text,numeric,date,numeric,numeric,jsonb) TO authenticated,service_role;

CREATE OR REPLACE FUNCTION public.enforce_proposal_duplicate_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_client uuid:=coalesce(NEW.client_reference_id,NEW.client_id); v_address text:=coalesce(NEW.content->'projectInfo'->>'address',NEW.project_info->>'address'); v_size numeric:=coalesce(nullif(NEW.content->'projectInfo'->>'systemSize','')::numeric,nullif(NEW.content->'projectInfo'->>'size','')::numeric,nullif(NEW.project_info->>'systemSize','')::numeric,nullif(NEW.project_info->>'size','')::numeric,NEW.system_size_kwp); v_lat numeric:=coalesce(nullif(NEW.content->'projectInfo'->>'gpsLat','')::numeric,nullif(NEW.project_info->>'gpsLat','')::numeric); v_lng numeric:=coalesce(nullif(NEW.content->'projectInfo'->>'gpsLng','')::numeric,nullif(NEW.project_info->>'gpsLng','')::numeric); v_match record;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended(concat_ws('|',v_client::text,public.normalize_project_identity(NEW.title),round(coalesce(v_size,0),1)::text),0));
 SELECT * INTO v_match FROM public.find_high_confidence_proposal_duplicate(v_client,NEW.title,v_address,v_size,v_lat,v_lng,NULL);
 IF v_match.proposal_id IS NOT NULL AND (NEW.duplicate_review_id IS NULL OR NOT EXISTS(SELECT 1 FROM public.proposal_duplicate_reviews r WHERE r.id=NEW.duplicate_review_id AND r.status='approved_separate' AND r.matched_proposal_id=v_match.proposal_id AND r.submitting_agent_id IS NOT DISTINCT FROM NEW.agent_id)) THEN RAISE EXCEPTION USING ERRCODE='P0001',MESSAGE='DUPLICATE_REVIEW_REQUIRED'; END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.enforce_proposal_duplicate_guard() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.enforce_proposal_duplicate_guard() TO service_role;