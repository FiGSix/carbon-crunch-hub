

## Problem Summary

Philip Henning's project cannot be marked "ready for audit" because the validation function is checking for a legacy `inverter_model` field that is `NULL`, even though the inverter data is correctly stored in the new JSON format.

---

## Root Cause

### Data Structure Mismatch

The onboarding form now stores inverter details as a JSON array in `inverter_serial`:

```json
[{"brand":"SunSynk","model":"SUNSYNK-8K-SG01LP1","capacity_kw":8,"serial":"2305278188"}]
```

But the validation function checks for the legacy `inverter_model` text field which is never populated.

### Philip Henning's Project Status

| Field | Value | Validation |
|-------|-------|------------|
| `system_address` | "20 Bruidslelie Crescent..." | PASS |
| `commissioning_date` | 2023-10-01 | PASS |
| `inverter_serial` (JSON) | Contains model "SUNSYNK-8K-SG01LP1" | - |
| `inverter_model` (legacy) | NULL | **FAIL** |
| `panel_brand` | JSON array with "Canadian Solar" | PASS |
| `total_capex` | 201000 | PASS |
| Documents | 1 CoC + 4 invoices | PASS |

---

## Solution

Update the `validate_onboarding_completion` database function to extract the inverter model from the JSON field instead of checking the legacy text field.

### Current Validation Logic (Failing)

```sql
inverter_model IS NOT NULL
```

### Updated Validation Logic

```sql
-- Extract model from JSON array if inverter_serial contains JSON
(
  inverter_model IS NOT NULL 
  OR (
    inverter_serial IS NOT NULL 
    AND inverter_serial LIKE '[%' 
    AND (inverter_serial::jsonb -> 0 ->> 'model') IS NOT NULL
  )
)
```

This handles both:
- Legacy projects with `inverter_model` as text
- New projects with inverter data stored as JSON in `inverter_serial`

---

## Technical Details

### Database Migration

A single SQL migration will update the validation function:

```sql
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
```

---

## Files Changed

| Location | Change |
|----------|--------|
| Database function | Update `validate_onboarding_completion` to handle JSON format |

---

## Expected Result

After this fix:
- Philip Henning's project will pass validation immediately
- All new projects using the JSON format will validate correctly
- Legacy projects with text fields will continue to work

