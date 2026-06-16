-- Fix ambiguous column reference in get_proposal_by_token_direct function
CREATE OR REPLACE FUNCTION public.get_proposal_by_token_direct(token_param text)
 RETURNS TABLE(id uuid, title text, status text, content jsonb, agent_id uuid, client_id uuid, client_reference_id uuid, signed_at timestamp with time zone, created_at timestamp with time zone, archived_at timestamp with time zone, review_later_until timestamp with time zone, is_preview boolean, preview_of_id uuid, client_email text, invitation_token text, invitation_expires_at timestamp with time zone, annual_energy numeric, carbon_credits numeric, client_share_percentage numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _client_email TEXT;
  _token_valid BOOLEAN;
  _client_id UUID;
  _client_reference_id UUID;
BEGIN
  SELECT 
    EXISTS(
      SELECT 1 
      FROM proposals 
      WHERE invitation_token = token_param AND invitation_expires_at > now()
    ) INTO _token_valid;
    
  IF NOT _token_valid THEN
    RAISE EXCEPTION 'Invalid or expired invitation token';
  END IF;

  -- First, fetch the client IDs
  SELECT p.client_id, p.client_reference_id
  INTO _client_id, _client_reference_id
  FROM proposals p
  WHERE p.invitation_token = token_param;

  -- Then use those IDs to get the email
  SELECT 
    COALESCE(
      (p.content->'clientInfo'->>'email'),
      (SELECT email FROM public.profiles WHERE id = _client_id),
      (SELECT email FROM public.clients WHERE id = _client_reference_id)
    ) INTO _client_email
  FROM proposals p
  WHERE p.invitation_token = token_param;

  RETURN QUERY
  SELECT
    p.id, p.title, p.status, p.content, p.agent_id, p.client_id,
    p.client_reference_id, p.signed_at, p.created_at, p.archived_at,
    p.review_later_until, p.is_preview, p.preview_of_id,
    _client_email as client_email, p.invitation_token, p.invitation_expires_at,
    p.annual_energy, p.carbon_credits, p.client_share_percentage
  FROM proposals p
  WHERE p.invitation_token = token_param AND p.invitation_expires_at > now();
END;
$function$;