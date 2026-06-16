-- Phase 1: Backfill missing user_roles entries
-- This ensures all existing agents appear in the agents management page
INSERT INTO public.user_roles (user_id, role)
SELECT p.id, p.role::app_role
FROM public.profiles p
WHERE p.role IN ('agent', 'admin', 'client')
  AND p.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = p.id AND ur.role = p.role::app_role
  )
ON CONFLICT (user_id, role) DO NOTHING;

-- Phase 2: Fix handle_new_user() trigger to restore user_roles synchronization
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
  
  -- Insert profile for the new user with proper agent_status handling
  INSERT INTO public.profiles (id, email, role, first_name, last_name, agent_status)
  VALUES (
    NEW.id, 
    NEW.email,
    user_role,
    NEW.raw_user_meta_data->>'first_name', 
    NEW.raw_user_meta_data->>'last_name',
    CASE 
      WHEN user_role = 'agent' 
      THEN COALESCE(NEW.raw_user_meta_data->>'agent_status', 'pending_approval')
      ELSE 'active'
    END
  );

  -- CRITICAL FIX: Insert into user_roles table to ensure proper role-based access
  -- This was accidentally removed in migration 20251105185141
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