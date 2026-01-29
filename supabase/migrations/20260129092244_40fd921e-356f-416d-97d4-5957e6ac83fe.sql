-- Update the create_onboarding_on_signature function to include agent info population
CREATE OR REPLACE FUNCTION public.create_onboarding_on_signature()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  new_project_id UUID;
  project_info JSONB;
  system_address_val TEXT;
  commissioning_date_val DATE;
  system_name_val TEXT;
  panel_total_kwp_val NUMERIC;
  gps_lat_val NUMERIC;
  gps_lng_val NUMERIC;
  agent_company_name_val TEXT;
  agent_email_val TEXT;
  is_crunch_carbon BOOLEAN;
BEGIN
  -- Handle both INSERT (bulk upload) and UPDATE (regular signature flow)
  IF (TG_OP = 'INSERT' AND NEW.signed_at IS NOT NULL) OR 
     (TG_OP = 'UPDATE' AND OLD.signed_at IS NULL AND NEW.signed_at IS NOT NULL) THEN
    
    -- Extract projectInfo from proposal content
    project_info := NEW.content->'projectInfo';
    
    -- Extract values with fallbacks
    system_address_val := COALESCE(
      project_info->>'address',
      NULL
    );
    
    commissioning_date_val := COALESCE(
      (project_info->>'commissionDate')::DATE,
      NULL
    );
    
    system_name_val := COALESCE(
      project_info->>'name',
      NEW.title,
      NULL
    );
    
    -- Get panel_total_kwp from system_size_kwp or projectInfo size
    panel_total_kwp_val := COALESCE(
      NEW.system_size_kwp,
      (project_info->>'size')::NUMERIC,
      NULL
    );
    
    -- Extract GPS coordinates from projectInfo
    gps_lat_val := COALESCE(
      (project_info->>'gpsLat')::NUMERIC,
      NULL
    );
    
    gps_lng_val := COALESCE(
      (project_info->>'gpsLng')::NUMERIC,
      NULL
    );
    
    -- Get agent's company and email
    IF NEW.agent_id IS NOT NULL THEN
      -- Get company name from companies table via company_members (priority)
      SELECT c.company_name INTO agent_company_name_val
      FROM company_members cm
      JOIN companies c ON cm.company_id = c.id
      WHERE cm.user_id = NEW.agent_id 
      AND cm.status = 'active'
      LIMIT 1;
      
      -- Fallback to profile company_name if no team membership
      IF agent_company_name_val IS NULL THEN
        SELECT company_name INTO agent_company_name_val
        FROM profiles
        WHERE id = NEW.agent_id;
      END IF;
      
      -- Get agent email from profiles
      SELECT email INTO agent_email_val
      FROM profiles
      WHERE id = NEW.agent_id;
    END IF;
    
    -- Check if agent is Crunch Carbon
    is_crunch_carbon := agent_company_name_val ILIKE '%crunch carbon%';
    
    -- Apply business rules: if no agent or Crunch Carbon, default to "To be confirmed"
    IF NEW.agent_id IS NULL OR is_crunch_carbon THEN
      agent_company_name_val := 'To be confirmed';
      agent_email_val := 'To be confirmed';
    END IF;
    
    -- Create the project_onboarding record
    INSERT INTO project_onboarding (proposal_id)
    VALUES (NEW.id)
    ON CONFLICT (proposal_id) DO NOTHING
    RETURNING id INTO new_project_id;
    
    -- If we didn't get a project_id (due to conflict), fetch it
    IF new_project_id IS NULL THEN
      SELECT id INTO new_project_id
      FROM project_onboarding
      WHERE proposal_id = NEW.id;
    END IF;
    
    -- Create or update onboarding_fields with pre-populated data including agent info
    INSERT INTO onboarding_fields (
      project_id,
      system_address,
      commissioning_date,
      system_name,
      panel_total_kwp,
      system_gps_lat,
      system_gps_lng,
      installer_company_name,
      installer_email
    )
    VALUES (
      new_project_id,
      system_address_val,
      commissioning_date_val,
      system_name_val,
      panel_total_kwp_val,
      gps_lat_val,
      gps_lng_val,
      agent_company_name_val,
      agent_email_val
    )
    ON CONFLICT (project_id) DO UPDATE SET
      system_address = COALESCE(EXCLUDED.system_address, onboarding_fields.system_address),
      commissioning_date = COALESCE(EXCLUDED.commissioning_date, onboarding_fields.commissioning_date),
      system_name = COALESCE(EXCLUDED.system_name, onboarding_fields.system_name),
      panel_total_kwp = COALESCE(EXCLUDED.panel_total_kwp, onboarding_fields.panel_total_kwp),
      system_gps_lat = COALESCE(EXCLUDED.system_gps_lat, onboarding_fields.system_gps_lat),
      system_gps_lng = COALESCE(EXCLUDED.system_gps_lng, onboarding_fields.system_gps_lng),
      installer_company_name = COALESCE(
        NULLIF(onboarding_fields.installer_company_name, ''),
        EXCLUDED.installer_company_name
      ),
      installer_email = COALESCE(
        NULLIF(onboarding_fields.installer_email, ''),
        EXCLUDED.installer_email
      );
    
  END IF;
  
  RETURN NEW;
END;
$function$;