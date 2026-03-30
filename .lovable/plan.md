

# Fix: Add Commission Date Validation to All Entry Points

## Root Cause Analysis

The "Boland Superspar" project bypassed date validation because the 2022-09-15 minimum commission date check is **only enforced in one narrow path**: the single-phase commission date input field in `ProjectInfoStep.tsx`. Three other entry paths have no validation:

### Gaps Found

| Entry Path | Validation Status | Issue |
|---|---|---|
| Single-phase proposal (UI) | Partial | Frontend-only; no server-side guard |
| **Multi-phase proposal (UI)** | **MISSING** | `handlePhasesChange` does zero date checks; `validateAndProceed` only checks `dateValidationError` which is never set for phases |
| **Bulk upload edge function** | **MISSING** | Hardcodes `commissionedAfter2022: true` without checking the actual date (line 217) |
| **Partner API** | **WRONG DATE** | Uses `2022-01-01` instead of `2022-09-15` (line 112 in `partner-validation.ts`) |
| Eligibility proposal edge function | OK | Validates against `2022-09-15` |

## Fix Plan (4 changes)

### 1. Database trigger — ultimate server-side guard (migration)
Create a `BEFORE UPDATE` trigger on `proposals` that blocks status changing to `'signed'` if the stored commission date is before 2022-09-15. This catches ALL paths regardless of frontend/API validation gaps.

```sql
CREATE OR REPLACE FUNCTION check_commission_date_before_signing()
RETURNS TRIGGER AS $$
DECLARE comm_date text;
BEGIN
  IF NEW.status = 'signed' AND OLD.status IS DISTINCT FROM 'signed' THEN
    comm_date := COALESCE(
      NEW.project_info->>'commissionDate',
      NEW.content->'projectInfo'->>'commissionDate'
    );
    IF comm_date IS NOT NULL AND comm_date::date < '2022-09-15'::date THEN
      RAISE EXCEPTION 'Cannot sign: commissioning date % is before 2022-09-15', comm_date;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### 2. Multi-phase date validation in frontend (`ProjectInfoStep.tsx`)
In `handlePhasesChange`, validate each phase's `commissionDate` against `validateCommissionDate()`. Set `dateValidationError` if any phase fails. This blocks the "Next" button for multi-phase proposals with invalid dates.

### 3. Bulk upload date validation (`supabase/functions/bulk-upload-legacy-projects/index.ts`)
Replace hardcoded `commissionedAfter2022: true` with an actual date check:
```typescript
const minDate = new Date('2022-09-15');
if (new Date(row.commissioning_date) < minDate) {
  throw new Error(`Commissioning date ${row.commissioning_date} is before minimum 2022-09-15`);
}
```

### 4. Partner API date fix (`supabase/functions/_shared/partner-validation.ts`)
Change line 112 from `new Date('2022-01-01')` to `new Date('2022-09-15')` and update the error message.

## Regarding "Boland Superspar"
This existing project needs a manual decision — either update its commission date or flag it as an exception. The database trigger only blocks future signings.

## Summary
- 1 migration (trigger)
- 1 frontend fix (multi-phase validation)
- 2 edge function fixes (bulk upload + partner API)
- All paths will enforce 2022-09-15 minimum, with the database trigger as the last line of defense

