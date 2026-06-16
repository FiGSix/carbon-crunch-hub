-- Step 1: Add missing RLS policy to clients table for client team members
CREATE POLICY "Client company members can view company clients"
ON public.clients
FOR SELECT
USING (
  client_company_id IS NOT NULL 
  AND client_company_id IN (
    SELECT ccm.client_company_id 
    FROM client_company_members ccm
    WHERE ccm.user_id = auth.uid()
    AND ccm.status = 'active'
  )
);

-- Step 2: Clean up data contamination - remove clients from agent teams
DELETE FROM company_members 
WHERE user_id IN (
  SELECT id FROM profiles WHERE role = 'client'
);

-- Step 3: Add validation trigger to prevent clients from being added to agent teams
CREATE OR REPLACE FUNCTION prevent_client_in_agent_teams()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM profiles WHERE id = NEW.user_id AND role = 'client') THEN
    RAISE EXCEPTION 'Clients cannot be added to agent teams (company_members). Use client_company_members instead.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER prevent_client_in_company_members
BEFORE INSERT ON company_members
FOR EACH ROW
EXECUTE FUNCTION prevent_client_in_agent_teams();

-- Step 4: Add validation trigger to prevent agents from being added to client teams
CREATE OR REPLACE FUNCTION prevent_agent_in_client_teams()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM profiles WHERE id = NEW.user_id AND role IN ('agent', 'admin')) THEN
    RAISE EXCEPTION 'Agents/Admins cannot be added to client teams (client_company_members). Use company_members instead.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER prevent_agent_in_client_company_members
BEFORE INSERT ON client_company_members
FOR EACH ROW
EXECUTE FUNCTION prevent_agent_in_client_teams();