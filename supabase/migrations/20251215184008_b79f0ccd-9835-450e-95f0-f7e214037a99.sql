-- Create trigger function to sync client_companies.company_name to clients.company_name
CREATE OR REPLACE FUNCTION sync_client_company_name()
RETURNS TRIGGER AS $$
BEGIN
  -- Update clients table when client_companies.company_name changes
  UPDATE clients 
  SET company_name = NEW.company_name,
      updated_at = NOW()
  WHERE client_company_id = NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger on client_companies table
DROP TRIGGER IF EXISTS sync_client_company_name_trigger ON client_companies;
CREATE TRIGGER sync_client_company_name_trigger
AFTER UPDATE OF company_name ON client_companies
FOR EACH ROW
WHEN (OLD.company_name IS DISTINCT FROM NEW.company_name)
EXECUTE FUNCTION sync_client_company_name();

-- Backfill: Sync existing company names from client_companies to clients table
UPDATE clients c
SET company_name = cc.company_name,
    updated_at = NOW()
FROM client_companies cc
WHERE c.client_company_id = cc.id
AND c.company_name IS DISTINCT FROM cc.company_name;