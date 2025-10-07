-- Fix ambiguous 'id' column references in token validation functions
-- The issue: 'id' appears in RETURNS TABLE and needs explicit table aliases in subqueries

-- Fix get_proposal_by_token_direct
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
  -- Check token validity
  SELECT 
    EXISTS(
      SELECT 1 
      FROM proposals p
      WHERE p.invitation_token = token_param AND p.invitation_expires_at > now()
    ) INTO _token_valid;
    
  IF NOT _token_valid THEN
    RAISE EXCEPTION 'Invalid or expired invitation token';
  END IF;

  -- First, fetch the client IDs
  SELECT p.client_id, p.client_reference_id
  INTO _client_id, _client_reference_id
  FROM proposals p
  WHERE p.invitation_token = token_param;

  -- Fixed: Added table aliases 'pr' and 'c' to avoid ambiguity with RETURNS TABLE id parameter
  SELECT 
    COALESCE(
      (p.content->'clientInfo'->>'email'),
      (SELECT pr.email FROM public.profiles pr WHERE pr.id = _client_id),
      (SELECT c.email FROM public.clients c WHERE c.id = _client_reference_id)
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

-- Fix validate_token_direct
CREATE OR REPLACE FUNCTION public.validate_token_direct(token_param text)
 RETURNS TABLE(proposal_id uuid, client_email text, client_id uuid, client_reference_id uuid, is_valid boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _proposal_id UUID;
  _client_email TEXT;
  _client_id UUID;
  _client_reference_id UUID;
  _is_valid BOOLEAN := false;
BEGIN
  -- Fixed: Added table aliases to avoid ambiguity
  SELECT 
    p.id, 
    COALESCE(
      (p.content->'clientInfo'->>'email'),
      (SELECT pr.email FROM public.profiles pr WHERE pr.id = p.client_id),
      (SELECT c.email FROM public.clients c WHERE c.id = p.client_reference_id)
    ),
    p.client_id,
    p.client_reference_id
  INTO _proposal_id, _client_email, _client_id, _client_reference_id
  FROM public.proposals p
  WHERE p.invitation_token = token_param AND p.invitation_expires_at > now();
  
  IF _proposal_id IS NOT NULL THEN
    _is_valid := true;
    RAISE NOTICE 'Valid proposal found for token: %, proposal_id: %', token_param, _proposal_id;
  ELSE
    RAISE WARNING 'No valid proposal found for token: %', token_param;
  END IF;
  
  RETURN QUERY SELECT _proposal_id, _client_email, _client_id, _client_reference_id, _is_valid;
END;
$function$;

-- Fix get_proposal_by_token
CREATE OR REPLACE FUNCTION public.get_proposal_by_token(token_param text)
 RETURNS TABLE(id uuid, title text, status text, content jsonb, agent_id uuid, client_id uuid, client_contact_id uuid, signed_at timestamp with time zone, created_at timestamp with time zone, archived_at timestamp with time zone, review_later_until timestamp with time zone, is_preview boolean, preview_of_id uuid, client_email text, invitation_token text, invitation_expires_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _client_email TEXT;
  _token_valid BOOLEAN;
BEGIN
  PERFORM set_config('request.invitation_token', token_param, true);
  
  SELECT 
    EXISTS(
      SELECT 1 
      FROM proposals p
      WHERE p.invitation_token = token_param AND p.invitation_expires_at > now()
    ) INTO _token_valid;
    
  IF NOT _token_valid THEN
    RAISE EXCEPTION 'Invalid or expired invitation token';
  END IF;

  -- Fixed: Added table aliases to avoid ambiguity with RETURNS TABLE id parameter
  SELECT 
    COALESCE(
      (p.content->'clientInfo'->>'email'),
      (SELECT pr.email FROM public.profiles pr WHERE pr.id = p.client_id),
      (SELECT c.email FROM public.clients c WHERE c.id = p.client_reference_id)
    ) INTO _client_email
  FROM proposals p
  WHERE p.invitation_token = token_param;

  RETURN QUERY
  SELECT
    p.id, p.title, p.status, p.content, p.agent_id, p.client_id,
    NULL::uuid as client_contact_id,
    p.signed_at, p.created_at, p.archived_at, p.review_later_until,
    p.is_preview, p.preview_of_id, _client_email as client_email,
    p.invitation_token, p.invitation_expires_at
  FROM proposals p
  WHERE p.invitation_token = token_param AND p.invitation_expires_at > now();
END;
$function$;