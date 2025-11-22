-- Create secure agent lookup function that checks user_roles table
CREATE OR REPLACE FUNCTION public.get_agent_by_email(email_param TEXT)
RETURNS TABLE(
  id UUID, 
  email TEXT, 
  first_name TEXT, 
  last_name TEXT, 
  agent_status TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.email,
    p.first_name,
    p.last_name,
    p.agent_status
  FROM public.profiles p
  WHERE LOWER(TRIM(p.email)) = LOWER(TRIM(email_param))
    AND p.deleted_at IS NULL
    AND EXISTS (
      SELECT 1 
      FROM public.user_roles ur
      WHERE ur.user_id = p.id 
        AND ur.role IN ('agent', 'admin')
    );
END;
$$;

COMMENT ON FUNCTION public.get_agent_by_email IS 'Securely retrieves agent profiles by checking the user_roles table for agent or admin roles. Supports multi-role users.';