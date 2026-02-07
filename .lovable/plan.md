
# Improve Validation for Onboarding and Data Access Sections

## Overview

After reviewing the codebase, I've identified several validation gaps in the Onboarding and Data Access sections that need addressing. Currently, validation is minimal and inconsistent:

**Current Issues Found:**

1. **Onboarding Tab**: No real-time field validation - users only see errors when submitting
2. **Data Access Tab**: Basic validation exists but lacks proper user feedback and input sanitization
3. **No Zod schema validation** for onboarding forms (unlike other parts of the app like Contact, Partner Invitation)
4. **Missing validation** for email format (installer email), phone formats, GPS coordinates, dates
5. **No inline error messages** - just section-level icons (green check/orange alert)
6. **Inconsistent required field indicators** - some fields have asterisks, others don't

---

## Technical Implementation Plan

### Phase 1: Create Onboarding Validation Schema

Create a comprehensive Zod validation schema for onboarding fields:

**New file: `src/lib/validation/onboardingSchema.ts`**

```text
+----------------------------------+
|   Onboarding Validation Schema   |
+----------------------------------+
|  - System Details section        |
|  - Inverter Details section      |
|  - Panel Details section         |
|  - Battery Details (conditional) |
|  - Financial section             |
|  - O&M section (conditional)     |
+----------------------------------+
```

**Fields to validate:**
- `system_address`: Required, min 5 chars
- `commissioning_date`: Required, valid date, not in future, after Sept 15, 2022
- `installer_email`: Optional, but must be valid email format if provided
- `system_gps_lat`: Optional, must be valid latitude (-90 to 90)
- `system_gps_lng`: Optional, must be valid longitude (-180 to 180)
- `inverter_quantity`: Required, 1-20 range
- `inverter_cost`, `panel_cost`, `battery_cost`: Positive numbers
- `total_capex`: Must be greater than 0
- Inverter details array: Each must have brand, model, capacity_kw, serial
- Panel details array: Each must have brand, size_wp, quantity

### Phase 2: Create Data Access Validation Schema

Create validation for data access configuration:

**New file: `src/lib/validation/dataAccessSchema.ts`**

**Fields to validate:**
- `provider`: Required, from predefined list
- `site_id`: Optional, max 100 chars
- `portal_url`: Optional, valid URL format
- `delegated_email`: Valid email format (defaults to data@crunchcarbon.com)
- `api_key_encrypted`: Required if method is "api_key"

### Phase 3: Create Validation Hooks

**New file: `src/hooks/useOnboardingValidation.ts`**

This hook will:
- Provide real-time field validation
- Track field-level errors
- Track touched/dirty state
- Provide section-level validation status
- Return specific error messages

**New file: `src/hooks/useDataAccessValidation.ts`**

Similar hook for data access form.

### Phase 4: Update OnboardingTab Component

Modify `src/pages/ProjectOnboardingDetail/OnboardingTab.tsx`:

1. **Add inline error messages** below each input field
2. **Show validation on blur** (when user leaves a field)
3. **Prevent submission** until required fields are valid
4. **Visual feedback**: Red border on invalid fields
5. **Clear error indicators**: Required field asterisks consistently applied

Example field update:
```tsx
<div className="space-y-2">
  <Label htmlFor="system_address">
    System Address <span className="text-destructive">*</span>
  </Label>
  <Input
    id="system_address"
    value={formData.system_address || ''}
    onChange={(e) => handleInputChange('system_address', e.target.value)}
    onBlur={() => validateField('system_address')}
    className={errors.system_address ? 'border-destructive' : ''}
  />
  {errors.system_address && (
    <p className="text-sm text-destructive">{errors.system_address}</p>
  )}
</div>
```

### Phase 5: Update DataAccessTab Component

Modify `src/pages/ProjectOnboardingDetail/DataAccessTab.tsx`:

1. **Inline error messages** for each field
2. **URL validation** for portal URL with proper feedback
3. **Email validation** for delegated email
4. **Visual feedback** on invalid fields
5. **Validation on blur** before submission

### Phase 6: Create Validation Summary Component

**New file: `src/components/onboarding/ValidationSummary.tsx`**

A component to show a summary of all validation errors before submission:

```text
+------------------------------------------+
|  ⚠️ Please fix the following issues:    |
|                                          |
|  System Details:                         |
|  • System address is required            |
|  • Commissioning date is required        |
|                                          |
|  Inverter Details:                       |
|  • Serial number is required for all     |
|    inverters                             |
+------------------------------------------+
```

### Phase 7: Update InverterDetailsRow and PanelArrayDetailsRow

Add validation feedback to dynamic row components:

- Pass validation errors as props
- Show red borders on invalid fields
- Show specific error messages per field

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/lib/validation/onboardingSchema.ts` | Zod schemas for onboarding fields |
| `src/lib/validation/dataAccessSchema.ts` | Zod schemas for data access config |
| `src/hooks/useOnboardingValidation.ts` | Validation hook for onboarding form |
| `src/hooks/useDataAccessValidation.ts` | Validation hook for data access form |
| `src/components/onboarding/ValidationSummary.tsx` | Summary of validation errors |

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/ProjectOnboardingDetail/OnboardingTab.tsx` | Add validation, inline errors, visual feedback |
| `src/pages/ProjectOnboardingDetail/DataAccessTab.tsx` | Add validation, inline errors, visual feedback |
| `src/components/onboarding/InverterDetailsRow.tsx` | Add error prop, visual validation states |
| `src/components/onboarding/PanelArrayDetailsRow.tsx` | Add error prop, visual validation states |

---

## Validation Rules Summary

### System Details
| Field | Required | Validation |
|-------|----------|------------|
| System Name | No | Max 100 chars |
| System Address | Yes | Min 5 chars |
| Commissioning Date | Yes | Valid date, not future, after Sept 2022 |
| Installer Email | No | Valid email format if provided |
| GPS Latitude | No | -90 to 90 if provided |
| GPS Longitude | No | -180 to 180 if provided |

### Inverter Details
| Field | Required | Validation |
|-------|----------|------------|
| Number of Inverters | Yes | 1-20 |
| Brand (per inverter) | Yes | From predefined list |
| Model (per inverter) | Yes | Min 1 char |
| Capacity kW (per inverter) | Yes | Positive number |
| Serial (per inverter) | Yes | Min 3 chars |
| Total Inverter Cost | No | Positive number if provided |

### Panel Details
| Field | Required | Validation |
|-------|----------|------------|
| Brand (per array) | Yes | From predefined list |
| Size Wp (per array) | Yes | 50-1000 Wp range |
| Quantity (per array) | Yes | 1-1000 |

### Battery Details (if has_battery = true)
| Field | Required | Validation |
|-------|----------|------------|
| Brand | Yes | From predefined list |
| Capacity kWh | Yes | Positive number, max 1000 |
| Cost | Yes | Positive number |

### Data Access
| Field | Required | Validation |
|-------|----------|------------|
| Provider | Yes | From predefined list |
| Site ID | No | Max 100 chars |
| Portal URL | No | Valid URL format |
| Delegated Email | Conditional | Valid email |
| API Key | Conditional | Min 10 chars if method=api_key |

---

## User Experience Improvements

1. **Real-time feedback**: Errors shown as user types/leaves fields
2. **Clear visual indicators**: Red borders and error text
3. **Consistent required markers**: Asterisks on all required fields
4. **Validation summary**: Before submission, show all issues
5. **Smart defaults**: Pre-fill delegated email, auto-calculate totals
6. **Helpful messages**: Specific, actionable error messages
7. **Prevent bad submissions**: Button disabled until form is valid

