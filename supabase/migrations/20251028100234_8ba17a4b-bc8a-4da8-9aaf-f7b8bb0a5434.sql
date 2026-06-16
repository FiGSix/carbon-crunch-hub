-- Fix set_request_invitation_token function missing search_path

CREATE OR REPLACE FUNCTION public.set_request_invitation_token(email_input text, token_input text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RAISE NOTICE 'Token set: % for %', token_input, email_input;
END;
$$;