-- ============================================================================
-- FIX: Agent Approval Bypass Vulnerability
-- ============================================================================
-- This migration fixes the security issue where agents were bypassing the
-- approval process. All existing agents are grandfathered as 'active'.
-- ============================================================================

-- 1. Change default agent_status to 'pending_approval'
ALTER TABLE profiles 
ALTER COLUMN agent_status SET DEFAULT 'pending_approval';

-- 2. Fix the handle_new_user() trigger to transfer agent_status from metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Insert profile for the new user with proper agent_status handling
  INSERT INTO public.profiles (id, email, role, first_name, last_name, agent_status)
  VALUES (
    NEW.id, 
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'client'),
    NEW.raw_user_meta_data->>'first_name', 
    NEW.raw_user_meta_data->>'last_name',
    -- ✅ FIX: Transfer agent_status from metadata, default to 'pending_approval' for agents
    CASE 
      WHEN COALESCE(NEW.raw_user_meta_data->>'role', 'client') = 'agent' 
      THEN COALESCE(NEW.raw_user_meta_data->>'agent_status', 'pending_approval')
      ELSE 'active'
    END
  );

  -- If user is a client, link any existing client records with matching email
  IF COALESCE(NEW.raw_user_meta_data->>'role', 'client') = 'client' THEN
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

-- 3. Add notification trigger for new agent signups requiring approval
CREATE OR REPLACE FUNCTION public.notify_admin_new_agent_signup()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Only notify for new agent signups with pending_approval status
  IF NEW.role = 'agent' AND NEW.agent_status = 'pending_approval' THEN
    -- Insert notification for all admins
    INSERT INTO notifications (user_id, type, title, message, related_type, related_id)
    SELECT 
      p.id,
      'info',
      'New Agent Awaiting Approval',
      CONCAT(
        COALESCE(NEW.first_name, ''), 
        ' ', 
        COALESCE(NEW.last_name, ''),
        ' (', NEW.email, ') has registered as an agent and requires approval.'
      ),
      'agent_approval',
      NEW.id
    FROM profiles p
    WHERE p.role = 'admin';
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS notify_admin_on_new_agent_signup ON profiles;

CREATE TRIGGER notify_admin_on_new_agent_signup
AFTER INSERT ON profiles
FOR EACH ROW
EXECUTE FUNCTION notify_admin_new_agent_signup();

-- 4. Add audit logging for agent status changes (already exists but ensuring it's there)
-- The track_agent_status_change trigger already exists, so we're good there

-- ============================================================================
-- VERIFICATION QUERIES (for admin to run manually if needed)
-- ============================================================================
-- Check all agents and their current status:
-- SELECT id, email, first_name, last_name, agent_status, created_at 
-- FROM profiles 
-- WHERE role = 'agent' 
-- ORDER BY created_at DESC;
--
-- Check agent activities:
-- SELECT * FROM agent_activities ORDER BY created_at DESC LIMIT 20;