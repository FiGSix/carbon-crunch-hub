-- Fix function search path security warning
-- Set search_path for the update_onboarding_timestamp function

CREATE OR REPLACE FUNCTION update_onboarding_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;