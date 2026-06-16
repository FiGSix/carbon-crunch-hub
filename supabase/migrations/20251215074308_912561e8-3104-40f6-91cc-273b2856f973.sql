-- Function to auto-create clients record for client team members
CREATE OR REPLACE FUNCTION sync_client_record_on_team_join()
RETURNS TRIGGER AS $$
DECLARE
  user_profile RECORD;
BEGIN
  -- Get the user's profile
  SELECT id, email, first_name, last_name, company_name, phone
  INTO user_profile
  FROM profiles
  WHERE id = NEW.user_id;
  
  -- Only proceed if user is a client and doesn't have a clients record
  IF user_profile.id IS NOT NULL 
     AND EXISTS (SELECT 1 FROM profiles WHERE id = NEW.user_id AND role = 'client')
     AND NOT EXISTS (SELECT 1 FROM clients WHERE user_id = NEW.user_id) 
  THEN
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger on client_company_members insert
CREATE TRIGGER sync_client_record_on_member_insert
AFTER INSERT ON client_company_members
FOR EACH ROW
EXECUTE FUNCTION sync_client_record_on_team_join();

-- Backfill: Create clients records for existing team members who don't have one
INSERT INTO clients (user_id, email, first_name, last_name, company_name, phone, client_company_id, created_at)
SELECT 
  p.id,
  p.email,
  p.first_name,
  p.last_name,
  p.company_name,
  p.phone,
  ccm.client_company_id,
  NOW()
FROM profiles p
JOIN client_company_members ccm ON ccm.user_id = p.id
WHERE p.role = 'client'
  AND NOT EXISTS (SELECT 1 FROM clients c WHERE c.user_id = p.id);