-- Create a function for admin to create agent users
CREATE OR REPLACE FUNCTION public.create_agent_user(
  email_param text,
  first_name_param text,
  last_name_param text,
  company_name_param text DEFAULT NULL,
  phone_param text DEFAULT NULL,
  license_number_param text DEFAULT NULL,
  territory_param text DEFAULT NULL,
  agent_status_param text DEFAULT 'pending_approval',
  access_level_param text DEFAULT 'standard',
  commission_override_param numeric DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_user_id uuid;
BEGIN
  -- Only admins can create agent users
  IF NOT is_current_user_admin() THEN
    RAISE EXCEPTION 'Only administrators can create agent accounts';
  END IF;

  -- Generate a new UUID for the user
  new_user_id := gen_random_uuid();

  -- Insert the profile directly (user will need to sign up separately)
  INSERT INTO public.profiles (
    id,
    email,
    first_name,
    last_name,
    company_name,
    phone,
    license_number,
    territory,
    role,
    agent_status,
    access_level,
    commission_override,
    onboarding_completed,
    join_date,
    created_at
  ) VALUES (
    new_user_id,
    email_param,
    first_name_param,
    last_name_param,
    company_name_param,
    phone_param,
    license_number_param,
    territory_param,
    'agent',
    agent_status_param,
    access_level_param,
    commission_override_param,
    false,
    CURRENT_DATE,
    now()
  );

  RETURN new_user_id;
END;
$$;