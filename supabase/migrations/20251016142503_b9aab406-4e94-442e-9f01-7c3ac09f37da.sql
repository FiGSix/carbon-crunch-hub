-- Fix handle_new_user() to create user_roles entries
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  user_role TEXT;
BEGIN
  -- Determine the role
  user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'client');
  
  -- Insert into profiles table
  INSERT INTO public.profiles (
    id, 
    first_name, 
    last_name, 
    company_name, 
    email, 
    role, 
    terms_accepted_at,
    agent_status
  ) VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name',
    NEW.raw_user_meta_data->>'company_name',
    NEW.email,
    user_role,
    CASE 
      WHEN NEW.raw_user_meta_data->>'terms_accepted_at' IS NOT NULL 
      THEN (NEW.raw_user_meta_data->>'terms_accepted_at')::TIMESTAMP WITH TIME ZONE 
      ELSE NULL 
    END,
    -- Set pending_approval status for agents, active for others
    CASE 
      WHEN user_role = 'agent' 
      THEN COALESCE(NEW.raw_user_meta_data->>'agent_status', 'pending_approval')
      ELSE 'active'
    END
  );
  
  -- CRITICAL: Insert into user_roles table to ensure proper role-based access
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, user_role::app_role);
  
  RETURN NEW;
END;
$$;

-- Backfill missing user_roles entries for existing agents
INSERT INTO public.user_roles (user_id, role)
SELECT p.id, 'agent'::app_role
FROM public.profiles p
WHERE p.role = 'agent'
  AND NOT EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = p.id AND ur.role = 'agent'::app_role
  )
ON CONFLICT (user_id, role) DO NOTHING;

-- Also backfill for any clients or admins missing entries
INSERT INTO public.user_roles (user_id, role)
SELECT p.id, p.role::app_role
FROM public.profiles p
WHERE p.role IN ('client', 'admin')
  AND NOT EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = p.id AND ur.role = p.role::app_role
  )
ON CONFLICT (user_id, role) DO NOTHING;