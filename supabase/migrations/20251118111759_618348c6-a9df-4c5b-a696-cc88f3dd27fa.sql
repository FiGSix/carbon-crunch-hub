-- Fix handle_new_user() to save all metadata fields including company_name, terms_accepted_at, and phone
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  user_role TEXT;
BEGIN
  -- Determine role from metadata
  user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'client');
  
  -- Insert profile for the new user with ALL relevant metadata fields
  INSERT INTO public.profiles (
    id, 
    email, 
    role, 
    first_name, 
    last_name, 
    company_name,
    phone,
    terms_accepted_at,
    agent_status
  )
  VALUES (
    NEW.id, 
    NEW.email,
    user_role,
    NEW.raw_user_meta_data->>'first_name', 
    NEW.raw_user_meta_data->>'last_name',
    NEW.raw_user_meta_data->>'company_name',
    NEW.raw_user_meta_data->>'phone',
    CASE 
      WHEN NEW.raw_user_meta_data->>'terms_accepted_at' IS NOT NULL 
      THEN (NEW.raw_user_meta_data->>'terms_accepted_at')::TIMESTAMP WITH TIME ZONE
      ELSE NULL
    END,
    CASE 
      WHEN user_role = 'agent' 
      THEN COALESCE(NEW.raw_user_meta_data->>'agent_status', 'pending_approval')
      ELSE 'active'
    END
  );

  -- Insert into user_roles table to ensure proper role-based access
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, user_role::app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  -- If user is a client, link any existing client records with matching email
  IF user_role = 'client' THEN
    UPDATE clients
    SET 
      user_id = NEW.id,
      updated_at = now()
    WHERE 
      email = NEW.email
      AND user_id IS NULL;
    
    RAISE NOTICE 'Linked client records for user % with email %', NEW.id, NEW.email;
  END IF;

  RETURN NEW;
END;
$function$;