REVOKE ALL ON FUNCTION public.find_high_confidence_proposal_duplicate(uuid,text,text,numeric,numeric,numeric,uuid) FROM authenticated;
REVOKE ALL ON FUNCTION public.find_high_confidence_proposal_duplicate(uuid,text,text,numeric,numeric,numeric,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.find_high_confidence_proposal_duplicate(uuid,text,text,numeric,numeric,numeric,uuid) TO service_role;

ALTER FUNCTION public.decide_proposal_duplicate_review(uuid,text,text) SECURITY INVOKER;
REVOKE ALL ON FUNCTION public.decide_proposal_duplicate_review(uuid,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.decide_proposal_duplicate_review(uuid,text,text) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.enforce_proposal_duplicate_guard() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enforce_proposal_duplicate_guard() TO service_role;