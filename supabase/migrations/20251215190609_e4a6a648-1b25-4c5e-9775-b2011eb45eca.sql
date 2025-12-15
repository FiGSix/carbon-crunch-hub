-- Add Admin UPDATE policy to clients table
CREATE POLICY "Admins can update all clients"
ON public.clients
FOR UPDATE
USING (is_current_user_admin())
WITH CHECK (is_current_user_admin());

-- Create reverse sync trigger function (clients → client_companies)
CREATE OR REPLACE FUNCTION sync_clients_to_client_company()
RETURNS TRIGGER AS $$
BEGIN
  -- Only sync if client has a company and company_name actually changed
  IF NEW.client_company_id IS NOT NULL 
     AND NEW.company_name IS DISTINCT FROM OLD.company_name THEN
    UPDATE client_companies 
    SET company_name = NEW.company_name,
        updated_at = NOW()
    WHERE id = NEW.client_company_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger on clients table for reverse sync
DROP TRIGGER IF EXISTS sync_clients_to_client_company_trigger ON clients;
CREATE TRIGGER sync_clients_to_client_company_trigger
AFTER UPDATE OF company_name ON clients
FOR EACH ROW
WHEN (OLD.company_name IS DISTINCT FROM NEW.company_name)
EXECUTE FUNCTION sync_clients_to_client_company();