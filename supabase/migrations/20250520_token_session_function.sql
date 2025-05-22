
-- Function to set the invitation token in the current session
CREATE OR REPLACE FUNCTION public.set_request_invitation_token(token text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Set the token with persistence (true) to ensure it's available across transactions
  PERFORM set_config('request.invitation_token', token, true);
  RETURN true;
END;
$$;

-- Grant execute permission to authenticated and anon users
GRANT EXECUTE ON FUNCTION public.set_request_invitation_token(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_request_invitation_token(text) TO anon;

