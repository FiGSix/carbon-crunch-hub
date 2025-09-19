-- Complete fix for bulk agent deletion
-- Step 1: Make agent_id nullable in proposals table
ALTER TABLE public.proposals 
ALTER COLUMN agent_id DROP NOT NULL;

-- Step 2: Create function to transfer client ownership before agent deletion
CREATE OR REPLACE FUNCTION public.transfer_agent_clients_to_crunch_carbon()
RETURNS TRIGGER AS $$
DECLARE
  crunch_carbon_admin_id UUID := '6538aa1a-c0dc-4ce4-ab6f-bb4368d9fce1'; -- Shaun Slabber
BEGIN
  -- Only process if the deleted user is an agent
  IF OLD.role = 'agent' THEN
    -- Transfer all clients created by this agent to Crunch Carbon admin
    UPDATE public.clients 
    SET created_by = crunch_carbon_admin_id,
        updated_at = now(),
        last_modified_by = crunch_carbon_admin_id
    WHERE created_by = OLD.id;
    
    -- Log the transfer
    RAISE NOTICE 'Transferred % clients from deleted agent % to Crunch Carbon admin', 
      (SELECT COUNT(*) FROM public.clients WHERE created_by = OLD.id), OLD.id;
  END IF;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 3: Create trigger to fire before profile deletion
CREATE TRIGGER transfer_clients_before_agent_deletion
  BEFORE DELETE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.transfer_agent_clients_to_crunch_carbon();