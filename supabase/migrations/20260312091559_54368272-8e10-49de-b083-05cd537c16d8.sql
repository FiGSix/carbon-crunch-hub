-- Add phases_json column to onboarding_fields
ALTER TABLE onboarding_fields 
  ADD COLUMN phases_json jsonb DEFAULT NULL;

-- Backfill existing multi-phase projects from proposals
UPDATE onboarding_fields of_row
SET phases_json = p.content->'projectInfo'->'phases'
FROM project_onboarding po
JOIN proposals p ON po.proposal_id = p.id
WHERE of_row.project_id = po.id
  AND (p.content->'projectInfo'->>'isMultiPhase')::boolean = true
  AND p.content->'projectInfo'->'phases' IS NOT NULL;

-- Update the create_onboarding_on_signature trigger to copy phases
CREATE OR REPLACE FUNCTION create_onboarding_on_signature()
RETURNS TRIGGER AS $$
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
  phases_json_val JSONB;
BEGIN
  IF (TG_OP = 'INSERT' AND NEW.signed_at IS NOT NULL) OR 
     (TG_OP = 'UPDATE' AND OLD.signed_at IS NULL AND NEW.signed_at IS NOT NULL) THEN
    
    project_info := NEW.content->'projectInfo';
    
    system_address_val := COALESCE(project_info->>'address', NULL);
    
    commissioning_date_val := COALESCE(
      (NULLIF(project_info->>'commissionDate', ''))::DATE, NULL
    );
    
    system_name_val := COALESCE(project_info->>'name', NEW.title, NULL);
    
    panel_total_kwp_val := COALESCE(
      NEW.system_size_kwp,
      (NULLIF(project_info->>'size', ''))::NUMERIC, NULL
    );
    
    gps_lat_val := COALESCE((NULLIF(project_info->>'gpsLat', ''))::NUMERIC, NULL);
    gps_lng_val := COALESCE((NULLIF(project_info->>'gpsLng', ''))::NUMERIC, NULL);
    
    -- Extract phases for multi-phase projects
    IF (project_info->>'isMultiPhase')::boolean = true 
       AND project_info->'phases' IS NOT NULL 
       AND jsonb_array_length(project_info->'phases') > 0 THEN
      phases_json_val := project_info->'phases';
    ELSE
      phases_json_val := NULL;
    END IF;
    
    IF NEW.agent_id IS NOT NULL THEN
      SELECT c.company_name INTO agent_company_name_val
      FROM company_members cm
      JOIN companies c ON cm.company_id = c.id
      WHERE cm.user_id = NEW.agent_id AND cm.status = 'active'
      LIMIT 1;
      
      IF agent_company_name_val IS NULL THEN
        SELECT company_name INTO agent_company_name_val
        FROM profiles WHERE id = NEW.agent_id;
      END IF;
      
      SELECT email INTO agent_email_val
      FROM profiles WHERE id = NEW.agent_id;
    END IF;
    
    is_crunch_carbon := agent_company_name_val ILIKE '%crunch carbon%';
    
    IF NEW.agent_id IS NULL OR is_crunch_carbon THEN
      agent_company_name_val := 'To be confirmed';
      agent_email_val := 'To be confirmed';
    END IF;
    
    INSERT INTO project_onboarding (proposal_id)
    VALUES (NEW.id)
    ON CONFLICT (proposal_id) DO NOTHING
    RETURNING id INTO new_project_id;
    
    IF new_project_id IS NULL THEN
      SELECT id INTO new_project_id
      FROM project_onboarding WHERE proposal_id = NEW.id;
    END IF;
    
    INSERT INTO onboarding_fields (
      project_id, system_address, commissioning_date, system_name,
      panel_total_kwp, system_gps_lat, system_gps_lng,
      installer_company_name, installer_email, phases_json
    )
    VALUES (
      new_project_id, system_address_val, commissioning_date_val, system_name_val,
      panel_total_kwp_val, gps_lat_val, gps_lng_val,
      agent_company_name_val, agent_email_val, phases_json_val
    )
    ON CONFLICT (project_id) DO UPDATE SET
      system_address = COALESCE(EXCLUDED.system_address, onboarding_fields.system_address),
      commissioning_date = COALESCE(EXCLUDED.commissioning_date, onboarding_fields.commissioning_date),
      system_name = COALESCE(EXCLUDED.system_name, onboarding_fields.system_name),
      panel_total_kwp = COALESCE(EXCLUDED.panel_total_kwp, onboarding_fields.panel_total_kwp),
      system_gps_lat = COALESCE(EXCLUDED.system_gps_lat, onboarding_fields.system_gps_lat),
      system_gps_lng = COALESCE(EXCLUDED.system_gps_lng, onboarding_fields.system_gps_lng),
      installer_company_name = COALESCE(
        NULLIF(onboarding_fields.installer_company_name, ''), EXCLUDED.installer_company_name
      ),
      installer_email = COALESCE(
        NULLIF(onboarding_fields.installer_email, ''), EXCLUDED.installer_email
      ),
      phases_json = COALESCE(EXCLUDED.phases_json, onboarding_fields.phases_json);
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update validate_onboarding_completion to handle multi-phase projects
CREATE OR REPLACE FUNCTION validate_onboarding_completion(project_id_param UUID)
RETURNS BOOLEAN AS $$
DECLARE
  required_fields_complete BOOLEAN;
  required_docs_present BOOLEAN;
  serial_data JSONB;
  is_new_format BOOLEAN;
  is_multi_phase BOOLEAN;
  phases_data JSONB;
BEGIN
  -- Get inverter_serial and phases_json
  SELECT 
    CASE 
      WHEN inverter_serial IS NOT NULL AND inverter_serial LIKE '[%' 
      THEN inverter_serial::jsonb 
      ELSE NULL 
    END,
    phases_json
  INTO serial_data, phases_data
  FROM onboarding_fields
  WHERE project_id = project_id_param;
  
  is_new_format := serial_data IS NOT NULL 
    AND jsonb_array_length(serial_data) > 0
    AND jsonb_typeof(serial_data -> 0) = 'object';

  -- Detect multi-phase: phases_json is a non-empty array
  is_multi_phase := phases_data IS NOT NULL 
    AND jsonb_typeof(phases_data) = 'array' 
    AND jsonb_array_length(phases_data) > 0;

  SELECT (
    system_address IS NOT NULL AND
    -- Commission date: required for single-phase, skipped for multi-phase (dates in phases_json)
    (
      is_multi_phase 
      OR commissioning_date IS NOT NULL
    ) AND
    -- Inverter model validation (format-aware)
    (
      inverter_model IS NOT NULL 
      OR (
        is_new_format 
        AND (serial_data -> 0 ->> 'model') IS NOT NULL
        AND (serial_data -> 0 ->> 'model') != ''
      )
    ) AND
    -- Inverter serial validation (format-aware)
    (
      inverter_serial IS NOT NULL 
      AND (
        (is_new_format AND (serial_data -> 0 ->> 'serial') IS NOT NULL AND (serial_data -> 0 ->> 'serial') != '')
        OR (
          NOT COALESCE(is_new_format, false)
          AND inverter_serial LIKE '[%' 
          AND inverter_model IS NOT NULL
          AND serial_data IS NOT NULL
          AND jsonb_array_length(serial_data) > 0
          AND (serial_data ->> 0) IS NOT NULL
          AND (serial_data ->> 0) != ''
        )
        OR (inverter_serial NOT LIKE '[%' AND inverter_serial != '')
      )
    ) AND
    (
      panel_brand IS NOT NULL 
      AND (
        (panel_brand LIKE '[%' AND (panel_brand::jsonb -> 0 ->> 'brand') IS NOT NULL)
        OR panel_brand NOT LIKE '[%'
      )
    ) AND
    total_capex > 0
  ) INTO required_fields_complete
  FROM onboarding_fields
  WHERE project_id = project_id_param;
  
  SELECT (
    EXISTS(SELECT 1 FROM onboarding_documents WHERE project_id = project_id_param AND category = 'coc') AND
    EXISTS(SELECT 1 FROM onboarding_documents WHERE project_id = project_id_param AND category = 'invoice')
  ) INTO required_docs_present;
  
  RETURN COALESCE(required_fields_complete, false) AND COALESCE(required_docs_present, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;