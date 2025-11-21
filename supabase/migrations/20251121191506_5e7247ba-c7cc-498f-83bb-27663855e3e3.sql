-- Create function to mark invitation as accepted when profile is created
CREATE OR REPLACE FUNCTION mark_invitation_accepted_on_profile_creation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- When a new agent profile is created, mark any pending invitation as accepted
  IF NEW.role = 'agent' THEN
    UPDATE agent_invitations
    SET 
      status = 'accepted',
      accepted_at = NEW.created_at
    WHERE LOWER(TRIM(email)) = LOWER(TRIM(NEW.email))
      AND status = 'pending'
      AND expires_at > NOW();
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to automatically mark invitations as accepted
DROP TRIGGER IF EXISTS trigger_mark_invitation_accepted ON profiles;
CREATE TRIGGER trigger_mark_invitation_accepted
AFTER INSERT ON profiles
FOR EACH ROW
EXECUTE FUNCTION mark_invitation_accepted_on_profile_creation();

-- Backfill existing data: Update all existing agents whose invitations are still pending
UPDATE agent_invitations ai
SET 
  status = 'accepted',
  accepted_at = p.created_at
FROM profiles p
WHERE LOWER(TRIM(ai.email)) = LOWER(TRIM(p.email))
  AND p.role = 'agent'
  AND ai.status = 'pending'
  AND p.deleted_at IS NULL;