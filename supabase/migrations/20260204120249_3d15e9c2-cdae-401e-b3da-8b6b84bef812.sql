CREATE OR REPLACE FUNCTION public.validate_onboarding_completion(project_id_param uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  required_fields_complete BOOLEAN;
  required_docs_present BOOLEAN;
BEGIN
  SELECT (
    system_address IS NOT NULL AND
    commissioning_date IS NOT NULL AND
    -- Check for inverter model in either legacy field OR JSON array
    (
      inverter_model IS NOT NULL 
      OR (
        inverter_serial IS NOT NULL 
        AND inverter_serial LIKE '[%' 
        AND (inverter_serial::jsonb -> 0 ->> 'model') IS NOT NULL
        AND (inverter_serial::jsonb -> 0 ->> 'model') != ''
      )
    ) AND
    -- Check for inverter serial in either JSON array or legacy field
    (
      inverter_serial IS NOT NULL 
      AND (
        (inverter_serial LIKE '[%' AND (inverter_serial::jsonb -> 0 ->> 'serial') IS NOT NULL)
        OR inverter_serial NOT LIKE '[%'
      )
    ) AND
    -- Check for panel brand in either JSON array or legacy text
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
$function$;