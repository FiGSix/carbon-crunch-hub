-- Update trigger to copy GPS coordinates from proposal to onboarding_fields
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
BEGIN
  -- Only proceed if signed_at changed from NULL to a value
  IF OLD.signed_at IS NULL AND NEW.signed_at IS NOT NULL THEN
    
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
    
    -- Create or update onboarding_fields with pre-populated data including GPS coordinates
    INSERT INTO onboarding_fields (
      project_id,
      system_address,
      commissioning_date,
      system_name,
      panel_total_kwp,
      system_gps_lat,
      system_gps_lng
    )
    VALUES (
      new_project_id,
      system_address_val,
      commissioning_date_val,
      system_name_val,
      panel_total_kwp_val,
      gps_lat_val,
      gps_lng_val
    )
    ON CONFLICT (project_id) DO UPDATE SET
      system_address = COALESCE(EXCLUDED.system_address, onboarding_fields.system_address),
      commissioning_date = COALESCE(EXCLUDED.commissioning_date, onboarding_fields.commissioning_date),
      system_name = COALESCE(EXCLUDED.system_name, onboarding_fields.system_name),
      panel_total_kwp = COALESCE(EXCLUDED.panel_total_kwp, onboarding_fields.panel_total_kwp),
      system_gps_lat = COALESCE(EXCLUDED.system_gps_lat, onboarding_fields.system_gps_lat),
      system_gps_lng = COALESCE(EXCLUDED.system_gps_lng, onboarding_fields.system_gps_lng);
    
  END IF;
  
  RETURN NEW;
END;
$function$;