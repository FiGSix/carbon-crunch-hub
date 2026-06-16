-- Create a secure function to get basic profile info for company members
-- This bypasses RLS but includes authorization checks
CREATE OR REPLACE FUNCTION public.get_company_member_profiles(
  _company_id uuid,
  _requesting_user_id uuid
)
RETURNS TABLE (
  user_id uuid,
  first_name text,
  last_name text,
  email text,
  avatar_url text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Authorization: Verify the requesting user is an active member of this company
  IF NOT EXISTS (
    SELECT 1 
    FROM company_members 
    WHERE company_id = _company_id 
      AND user_id = _requesting_user_id 
      AND status = 'active'
  ) AND NOT is_current_user_admin() THEN
    RAISE EXCEPTION 'Unauthorized: User is not a member of this company';
  END IF;

  -- Return only safe profile fields for company members
  RETURN QUERY
  SELECT 
    p.id as user_id,
    p.first_name,
    p.last_name,
    p.email,
    p.avatar_url
  FROM profiles p
  INNER JOIN company_members cm ON cm.user_id = p.id
  WHERE cm.company_id = _company_id
    AND cm.status IN ('active', 'pending')
    AND p.deleted_at IS NULL;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_company_member_profiles(uuid, uuid) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION public.get_company_member_profiles IS 
'Securely fetches basic profile information for company members. Only returns safe fields (name, email, avatar) and verifies the requesting user is a member of the company.';