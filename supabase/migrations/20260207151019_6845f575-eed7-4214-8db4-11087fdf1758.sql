-- Fix validate_onboarding_completion to handle legacy inverter data formats
-- Legacy format: ["S/N: 123", "S/N: 456"] (string array)
-- New format: [{"brand": "Solis", "model": "...", "serial": "..."}] (object array)

CREATE OR REPLACE FUNCTION public.validate_onboarding_completion(project_id_param uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  required_fields_complete BOOLEAN;
  required_docs_present BOOLEAN;
  serial_data JSONB;
  is_new_format BOOLEAN;
BEGIN
  -- First, get the inverter_serial as JSONB for format detection
  SELECT 
    CASE 
      WHEN inverter_serial IS NOT NULL AND inverter_serial LIKE '[%' 
      THEN inverter_serial::jsonb 
      ELSE NULL 
    END INTO serial_data
  FROM onboarding_fields
  WHERE project_id = project_id_param;
  
  -- Detect format: new format has objects, old format has strings
  -- jsonb_typeof returns 'object' for objects, 'string' for strings
  is_new_format := serial_data IS NOT NULL 
    AND jsonb_array_length(serial_data) > 0
    AND jsonb_typeof(serial_data -> 0) = 'object';

  SELECT (
    system_address IS NOT NULL AND
    commissioning_date IS NOT NULL AND
    -- Inverter model validation (format-aware)
    (
      -- Legacy flat field has value
      inverter_model IS NOT NULL 
      OR (
        -- New format: extract model from JSON object
        is_new_format 
        AND (serial_data -> 0 ->> 'model') IS NOT NULL
        AND (serial_data -> 0 ->> 'model') != ''
      )
    ) AND
    -- Inverter serial validation (format-aware)
    (
      inverter_serial IS NOT NULL 
      AND (
        -- New format: check object has serial key
        (is_new_format AND (serial_data -> 0 ->> 'serial') IS NOT NULL AND (serial_data -> 0 ->> 'serial') != '')
        -- Old format: string array with legacy model field populated
        OR (
          NOT COALESCE(is_new_format, false)
          AND inverter_serial LIKE '[%' 
          AND inverter_model IS NOT NULL
          AND serial_data IS NOT NULL
          AND jsonb_array_length(serial_data) > 0
          AND (serial_data ->> 0) IS NOT NULL
          AND (serial_data ->> 0) != ''
        )
        -- Single legacy string (not an array)
        OR (inverter_serial NOT LIKE '[%' AND inverter_serial != '')
      )
    ) AND
    -- Panel brand check (unchanged - already handles both formats)
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
  
  -- Document check (unchanged)
  SELECT (
    EXISTS(SELECT 1 FROM onboarding_documents WHERE project_id = project_id_param AND category = 'coc') AND
    EXISTS(SELECT 1 FROM onboarding_documents WHERE project_id = project_id_param AND category = 'invoice')
  ) INTO required_docs_present;
  
  RETURN COALESCE(required_fields_complete, false) AND COALESCE(required_docs_present, false);
END;
$function$;