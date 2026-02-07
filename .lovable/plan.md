
# Fix: Audit Validation Failing for Legacy Inverter Data Format

## Problem Summary

**FLM Penny Lane** and **FLM Lords view** cannot be validated as "audit ready" because their inverter data is stored in an **old format** that the validation RPC function doesn't recognize.

### Data Format Mismatch

| Field | Old Format (Current Data) | New Format (Expected) |
|-------|---------------------------|----------------------|
| `inverter_serial` | `["S/N: 11822223B160027", "S/N: ..."]` | `[{"brand": "Solis", "model": "...", "serial": "..."}]` |

The validation function `validate_onboarding_completion` tries to extract `model` and `serial` from JSON objects, but finds `null` because the data is just strings.

---

## Solution

There are two approaches to fix this:

### Option A: Update RPC to Handle Both Formats (Recommended)

Modify the `validate_onboarding_completion` RPC function to detect and accept both the old string array format AND the new object array format.

**Changes:**
- Check if `inverter_serial[0]` is a string (old format) or object (new format)
- For old format: validate that the string is non-empty AND legacy `inverter_model` field is populated
- For new format: validate using object key extraction (current logic)

### Option B: Auto-migrate Data on Page Load

Modify the OnboardingTab to automatically save the migrated data format when legacy data is detected.

**Downside:** Requires user to open the page for each project to trigger migration.

---

## Recommended Implementation (Option A)

Update the RPC function to be backwards-compatible:

```sql
-- Updated validate_onboarding_completion function
DECLARE
  required_fields_complete BOOLEAN;
  required_docs_present BOOLEAN;
  serial_data JSONB;
  is_new_format BOOLEAN;
BEGIN
  -- Get the inverter_serial as JSONB for inspection
  SELECT inverter_serial::jsonb INTO serial_data
  FROM onboarding_fields
  WHERE project_id = project_id_param
  AND inverter_serial IS NOT NULL 
  AND inverter_serial LIKE '[%';
  
  -- Detect format: new format has objects, old format has strings
  is_new_format := serial_data IS NOT NULL 
    AND jsonb_typeof(serial_data -> 0) = 'object';

  SELECT (
    system_address IS NOT NULL AND
    commissioning_date IS NOT NULL AND
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
        -- New format: check object has serial key
        (is_new_format AND (serial_data -> 0 ->> 'serial') IS NOT NULL)
        -- Old format: check it's a non-empty string array with legacy model field
        OR (
          NOT is_new_format 
          AND inverter_serial LIKE '[%' 
          AND inverter_model IS NOT NULL
          AND jsonb_array_length(serial_data) > 0
          AND (serial_data ->> 0) IS NOT NULL
        )
        -- Single legacy string
        OR (inverter_serial NOT LIKE '[%' AND inverter_serial != '')
      )
    ) AND
    -- Panel brand check (unchanged)
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
```

---

## Files to Modify

| File | Change |
|------|--------|
| `supabase/migrations/xxx_fix_validation_legacy_format.sql` | Update `validate_onboarding_completion` RPC to handle both formats |

---

## Testing Plan

After implementation:
1. Verify FLM Penny Lane validation returns `true`
2. Verify FLM Lords view validation returns `true`
3. Verify new format projects still validate correctly
4. Verify projects missing required fields still fail validation

---

## Additional Notes

- Both projects have all required data - the issue is purely a **format detection problem**
- The frontend already handles migration correctly when users edit/save
- This RPC fix ensures backwards compatibility without requiring manual data fixes
