
CREATE OR REPLACE FUNCTION public.get_public_homeowner_stats()
RETURNS TABLE(
  homeowner_count integer,
  co2_offset_tons numeric,
  total_system_kwp numeric,
  signed_proposal_count integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (SELECT COUNT(*)::int FROM public.user_roles WHERE role = 'client'),
    COALESCE((SELECT SUM(carbon_credits) FROM public.proposals WHERE status = 'signed' AND deleted_at IS NULL), 0),
    COALESCE((SELECT SUM(system_size_kwp) FROM public.proposals WHERE status = 'signed' AND deleted_at IS NULL), 0),
    COALESCE((SELECT COUNT(*)::int FROM public.proposals WHERE status = 'signed' AND deleted_at IS NULL), 0);
$$;

GRANT EXECUTE ON FUNCTION public.get_public_homeowner_stats() TO anon, authenticated;
