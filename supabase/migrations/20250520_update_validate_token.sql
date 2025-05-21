
-- Update the validate_invitation_token function to handle client_email more reliably
CREATE OR REPLACE FUNCTION public.validate_invitation_token(token text)
 RETURNS TABLE(proposal_id uuid, client_email text, client_id uuid, client_contact_id uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _proposal_id UUID;
  _client_email TEXT;
  _client_id UUID;
  _client_contact_id UUID;
BEGIN
  -- Set the invitation token in the current session context for RLS policies
  -- This ensures the token is available throughout the session
  PERFORM set_config('request.invitation_token', token, false);
  
  -- Find the proposal with the given token that hasn't expired
  SELECT 
    p.id, 
    COALESCE(
      -- First try to get email from content
      (p.content->'clientInfo'->>'email'),
      -- Then try to get email from client profile
      (SELECT email FROM public.profiles WHERE id = p.client_id),
      -- Finally try to get email from client contact
      (SELECT email FROM public.client_contacts WHERE id = p.client_contact_id)
    ),
    p.client_id,
    p.client_contact_id
  INTO 
    _proposal_id, 
    _client_email,
    _client_id,
    _client_contact_id
  FROM 
    public.proposals p
  WHERE 
    p.invitation_token = token
    AND p.invitation_expires_at > now();
  
  -- Check if proposal was found
  IF _proposal_id IS NULL THEN
    RAISE WARNING 'No valid proposal found for token: %', token;
  ELSE
    -- Log successful token validation
    RAISE NOTICE 'Valid proposal found for token: %, proposal_id: %', token, _proposal_id;
  END IF;
  
  RETURN QUERY SELECT _proposal_id, _client_email, _client_id, _client_contact_id;
END;
$function$;
