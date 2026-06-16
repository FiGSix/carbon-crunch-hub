-- Fix: Prevent duplicate email constraint violation during client registration
-- The function now checks for existing client records by BOTH user_id AND email,
-- and updates existing records instead of trying to insert duplicates.

CREATE OR REPLACE FUNCTION sync_client_record_on_team_join()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_profile RECORD;
  existing_client_id UUID;
BEGIN
  -- Get the user's profile
  SELECT id, email, first_name, last_name, company_name, phone
  INTO user_profile
  FROM profiles
  WHERE id = NEW.user_id;
  
  -- Only proceed if we have a valid profile and user is a client
  IF user_profile.id IS NULL THEN
    RETURN NEW;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = NEW.user_id AND role = 'client') THEN
    RETURN NEW;
  END IF;
  
  -- Check if client record already exists by user_id
  IF EXISTS (SELECT 1 FROM clients WHERE user_id = NEW.user_id) THEN
    -- Already linked, just update company if needed
    UPDATE clients
    SET client_company_id = COALESCE(client_company_id, NEW.client_company_id),
        updated_at = NOW()
    WHERE user_id = NEW.user_id
      AND client_company_id IS NULL;
    RETURN NEW;
  END IF;
  
  -- Check if client record exists by email (from proposal creation, user_id is NULL)
  SELECT id INTO existing_client_id
  FROM clients
  WHERE email = user_profile.email
  LIMIT 1;
  
  IF existing_client_id IS NOT NULL THEN
    -- Link existing client record to this user
    UPDATE clients
    SET user_id = NEW.user_id,
        client_company_id = COALESCE(client_company_id, NEW.client_company_id),
        first_name = COALESCE(first_name, user_profile.first_name),
        last_name = COALESCE(last_name, user_profile.last_name),
        updated_at = NOW()
    WHERE id = existing_client_id;
  ELSE
    -- No existing record, create new one
    INSERT INTO clients (
      user_id,
      email,
      first_name,
      last_name,
      company_name,
      phone,
      client_company_id,
      created_at
    ) VALUES (
      NEW.user_id,
      user_profile.email,
      user_profile.first_name,
      user_profile.last_name,
      user_profile.company_name,
      user_profile.phone,
      NEW.client_company_id,
      NOW()
    );
  END IF;
  
  RETURN NEW;
END;
$$;