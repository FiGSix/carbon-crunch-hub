
-- Fix search_path on the new function
CREATE OR REPLACE FUNCTION public.handle_client_invitation_acceptance()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role = 'client' THEN
    UPDATE public.client_invitations
    SET status = 'accepted'
    WHERE LOWER(email) = LOWER(NEW.email)
    AND status = 'pending';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
