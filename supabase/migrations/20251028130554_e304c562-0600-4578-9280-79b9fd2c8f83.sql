-- Fix security warning: Update function with proper search_path
DROP FUNCTION IF EXISTS get_pending_team_invitations(UUID);

CREATE OR REPLACE FUNCTION get_pending_team_invitations(company_id_param UUID)
RETURNS TABLE (
  id UUID,
  email TEXT,
  first_name TEXT,
  last_name TEXT,
  company_id UUID,
  invitation_token TEXT,
  invited_by UUID,
  inviter_name TEXT,
  status TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ti.id,
    ti.email,
    ti.first_name,
    ti.last_name,
    ti.company_id,
    ti.invitation_token,
    ti.invited_by,
    TRIM(CONCAT(COALESCE(p.first_name, ''), ' ', COALESCE(p.last_name, ''))) as inviter_name,
    ti.status,
    ti.expires_at,
    ti.created_at
  FROM public.team_invitations ti
  LEFT JOIN public.profiles p ON p.id = ti.invited_by
  WHERE ti.company_id = company_id_param
    AND ti.status = 'pending'
    AND ti.expires_at > now()
  ORDER BY ti.created_at DESC;
END;
$$;