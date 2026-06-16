-- Fix onboarding trigger to work with bulk uploads (INSERT operations)

-- Step 1: Update the function to handle both INSERT and UPDATE
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
  -- Handle both INSERT (bulk upload) and UPDATE (regular signature flow)
  -- For INSERT: OLD is NULL, so check if NEW.signed_at exists
  -- For UPDATE: Check if signed_at changed from NULL to a value
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

-- Step 2: Add INSERT trigger for bulk upload compatibility
DROP TRIGGER IF EXISTS trigger_create_onboarding_on_insert ON proposals;

CREATE TRIGGER trigger_create_onboarding_on_insert
AFTER INSERT ON proposals
FOR EACH ROW
WHEN (NEW.signed_at IS NOT NULL)
EXECUTE FUNCTION create_onboarding_on_signature();

-- Step 3: Backfill existing legacy projects that don't have onboarding records
DO $$
DECLARE
  proposal_record RECORD;
  new_project_id UUID;
  project_info JSONB;
BEGIN
  -- Find all signed proposals without project_onboarding records
  FOR proposal_record IN 
    SELECT p.*
    FROM proposals p
    LEFT JOIN project_onboarding po ON po.proposal_id = p.id
    WHERE p.signed_at IS NOT NULL
      AND po.id IS NULL
      AND p.deleted_at IS NULL
  LOOP
    -- Create project_onboarding record
    INSERT INTO project_onboarding (proposal_id)
    VALUES (proposal_record.id)
    ON CONFLICT (proposal_id) DO NOTHING
    RETURNING id INTO new_project_id;
    
    -- If conflict, get the existing id
    IF new_project_id IS NULL THEN
      SELECT id INTO new_project_id
      FROM project_onboarding
      WHERE proposal_id = proposal_record.id;
    END IF;
    
    -- Extract project info
    project_info := proposal_record.content->'projectInfo';
    
    -- Create onboarding_fields with available data
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
      COALESCE(project_info->>'address', NULL),
      COALESCE((project_info->>'commissionDate')::DATE, NULL),
      COALESCE(project_info->>'name', proposal_record.title, NULL),
      COALESCE(proposal_record.system_size_kwp, (project_info->>'size')::NUMERIC, NULL),
      COALESCE((project_info->>'gpsLat')::NUMERIC, NULL),
      COALESCE((project_info->>'gpsLng')::NUMERIC, NULL)
    )
    ON CONFLICT (project_id) DO NOTHING;
    
    RAISE NOTICE 'Backfilled project_onboarding for proposal: %', proposal_record.id;
  END LOOP;
END $$;