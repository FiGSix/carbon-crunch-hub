CREATE OR REPLACE FUNCTION public.get_client_company_member_profiles(_company_id uuid, _requesting_user_id uuid)
RETURNS TABLE(user_id uuid, first_name text, last_name text, email text, avatar_url text)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM client_company_members ccm
    WHERE ccm.client_company_id = _company_id
      AND ccm.user_id = _requesting_user_id
      AND ccm.status = 'active'
  ) AND NOT is_current_user_admin() THEN
    RAISE EXCEPTION 'Unauthorized: User is not a member of this company';
  END IF;

  RETURN QUERY
  SELECT
    p.id AS user_id,
    p.first_name,
    p.last_name,
    p.email,
    p.avatar_url
  FROM profiles p
  INNER JOIN client_company_members ccm ON ccm.user_id = p.id
  WHERE ccm.client_company_id = _company_id
    AND ccm.status IN ('active', 'pending')
    AND p.deleted_at IS NULL;
END;
$function$;

REVOKE ALL ON FUNCTION public.get_client_company_member_profiles(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_client_company_member_profiles(uuid, uuid) TO authenticated;