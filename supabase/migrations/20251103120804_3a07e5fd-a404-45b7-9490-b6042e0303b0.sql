-- Fix security warning: Set search_path for update_team_invitation_timestamp function
CREATE OR REPLACE FUNCTION public.update_team_invitation_timestamp()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;