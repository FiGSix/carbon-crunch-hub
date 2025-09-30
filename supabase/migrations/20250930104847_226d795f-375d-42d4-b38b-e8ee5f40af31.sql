-- Fix search path for transfer_agent_clients_to_crunch_carbon function
CREATE OR REPLACE FUNCTION public.transfer_agent_clients_to_crunch_carbon()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
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
$function$;