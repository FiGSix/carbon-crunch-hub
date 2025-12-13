-- Step 1: Create trigger function to auto-link clients.client_company_id
-- when a user is added to client_company_members
CREATE OR REPLACE FUNCTION public.sync_client_company_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- When a user is added or updated in client_company_members,
  -- update their corresponding clients record to link to the same company
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE clients 
    SET client_company_id = NEW.client_company_id,
        updated_at = now()
    WHERE user_id = NEW.user_id
      AND (client_company_id IS NULL OR client_company_id != NEW.client_company_id);
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;

-- Step 2: Create the trigger on client_company_members
DROP TRIGGER IF EXISTS trigger_sync_client_company_id ON client_company_members;

CREATE TRIGGER trigger_sync_client_company_id
AFTER INSERT OR UPDATE ON client_company_members
FOR EACH ROW
EXECUTE FUNCTION sync_client_company_id();

-- Step 3: Fix all existing orphaned records - link clients to their client_company
-- based on user_id matching active client_company_members
UPDATE clients c
SET client_company_id = ccm.client_company_id,
    updated_at = now()
FROM client_company_members ccm
WHERE c.user_id = ccm.user_id
  AND ccm.status = 'active'
  AND c.client_company_id IS NULL;