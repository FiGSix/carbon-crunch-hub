
-- Function to set the invitation token in the current session
CREATE OR REPLACE FUNCTION public.set_request_invitation_token(token text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM set_config('request.invitation_token', token, false);
END;
$$;
