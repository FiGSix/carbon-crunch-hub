-- Update handle_new_user function to set pending_approval for new agents
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
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
    COALESCE(NEW.raw_user_meta_data->>'role', 'client'),
    CASE 
      WHEN NEW.raw_user_meta_data->>'terms_accepted_at' IS NOT NULL 
      THEN (NEW.raw_user_meta_data->>'terms_accepted_at')::TIMESTAMP WITH TIME ZONE 
      ELSE NULL 
    END,
    -- Set pending_approval status for agents, active for others
    CASE 
      WHEN COALESCE(NEW.raw_user_meta_data->>'role', 'client') = 'agent' 
      THEN COALESCE(NEW.raw_user_meta_data->>'agent_status', 'pending_approval')
      ELSE 'active'
    END
  );
  RETURN NEW;
END;
$$;

-- Function to notify admins when a new agent is created
CREATE OR REPLACE FUNCTION public.notify_admins_on_new_agent()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_record RECORD;
BEGIN
  -- Only notify if this is a new agent with pending_approval status
  IF NEW.role = 'agent' AND NEW.agent_status = 'pending_approval' THEN
    
    -- Insert notification for each admin
    FOR admin_record IN 
      SELECT id FROM public.profiles WHERE role = 'admin'
    LOOP
      INSERT INTO public.notifications (
        user_id,
        type,
        title,
        message,
        related_type,
        related_id
      ) VALUES (
        admin_record.id,
        'info',
        'New Agent Awaiting Approval',
        format('Agent %s %s (%s) has registered and is awaiting approval.', 
          COALESCE(NEW.first_name, ''), 
          COALESCE(NEW.last_name, ''), 
          NEW.email
        ),
        'agent_approval',
        NEW.id
      );
    END LOOP;
    
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on profiles table
DROP TRIGGER IF EXISTS on_new_agent_notify_admins ON public.profiles;
CREATE TRIGGER on_new_agent_notify_admins
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_admins_on_new_agent();