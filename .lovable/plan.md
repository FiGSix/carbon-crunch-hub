

# Phase 1: Regional Solar Yield Lookup Table

## Overview

Replace the single fixed annual generation factor (1,642.50 kWh/kWp/year) with a province-specific lookup so that energy calculations reflect regional solar irradiance differences across South Africa. Also fix the edge function discrepancy (it uses 1,300 and 0.93 instead of 1,642.50 and 1.0334).

---

## South African Provincial Yield Data

Based on published solar irradiance data for South Africa, these are the researched specific yield values (kWh/kWp/year):

| Province | kWh/kWp/year | Notes |
|---|---|---|
| Northern Cape | 1,800 | Highest irradiance in SA |
| Free State | 1,750 | High plateau irradiance |
| North West | 1,720 | Semi-arid, good irradiance |
| Limpopo | 1,680 | Northern subtropical |
| Mpumalanga | 1,620 | Eastern escarpment, slightly lower |
| Gauteng | 1,650 | High altitude plateau |
| Eastern Cape | 1,580 | Coastal/inland variation |
| KwaZulu-Natal | 1,520 | Coastal humidity reduces yield |
| Western Cape | 1,600 | Mediterranean climate |
| **National Average** | **1,642** | **Current default (fallback)** |

These values will be stored in a new database table so they can be updated by admins without code changes.

---

## What Changes

### 1. New Database Table: `regional_solar_yields`

Stores province-level yield factors. Seeded with initial data. Admins can update values over time.

```text
Columns:
- id (uuid, PK)
- province (text, unique, not null)
- yield_kwh_per_kwp (numeric, not null)  -- annual kWh per kWp
- source (text)                           -- where the data came from
- updated_at (timestamptz)
- updated_by (uuid)
```

RLS: Anyone authenticated can read. Only admins can insert/update/delete.

### 2. Updated Calculation Functions

**`src/services/calculations/carbon/calculations.ts`**

- Add an optional `province` parameter to `calculateAnnualEnergy(systemSizeKwp, province?)`
- When province is provided, look up the yield factor from a cached map; otherwise fall back to 1,642.50
- Add a `getRegionalYieldFactor(province)` function that fetches and caches the lookup table
- `calculateCarbonCredits` passes through the province parameter

The signature change is backward-compatible: all existing callers that omit province continue to get the national average.

### 3. Cache Layer

**`src/services/calculations/carbon/regionalYields.ts`** (new file)

- Fetches `regional_solar_yields` from Supabase once and caches in memory
- Provides `getYieldForProvince(province: string): number` -- returns the regional factor or fallback
- Cache expires after 1 hour (yields rarely change)

### 4. Wire Province into Existing Flows

**Where province data already exists:**
- `onboarding_fields` table has `system_address` (province can be extracted)
- `QuickCalc` page already collects province from user
- Proposal `content.projectInfo` often contains address info

**Changes needed:**
- `QuickCalc.tsx`: Pass province to `calculateAnnualEnergy` so Quick Calc uses regional yields
- `CarbonCreditSection.tsx`: Extract province from proposal data, pass to calculations
- `carbonCalculations.ts`: Accept optional province, pass to `UnifiedCarbonService.calculateAnnualEnergy`
- `core.ts`: Accept province in `SystemSpecs`, use it in `calculateComplete`

### 5. Fix Edge Function Discrepancy

**`supabase/functions/send-calculator-results/index.ts`**

- Line 96: Change `systemSizeKwp * 1300` to `systemSizeKwp * 1642.50`
- Line 97: Change `0.93` to `1.0334`
- This aligns the email calculator with the frontend

### 6. Display the Yield Factor

In the QuickCalc results and proposal summary, show which yield factor was used:
- "Based on [Province] solar yield: 1,800 kWh/kWp/year" (or "National average: 1,642 kWh/kWp/year" if no province)

---

## Files Summary

| File | Change |
|---|---|
| **Database migration** | Create `regional_solar_yields` table with seed data and RLS |
| `src/services/calculations/carbon/regionalYields.ts` | **New** -- fetch + cache regional yield factors |
| `src/services/calculations/carbon/calculations.ts` | Add optional `province` param, use regional yield |
| `src/services/calculations/carbon/types.ts` | Add `province?: string` to `SystemSpecs` |
| `src/services/calculations/carbon/core.ts` | Pass province through to calculation functions |
| `src/services/calculations/carbon/index.ts` | Re-export new function, update static methods |
| `src/pages/QuickCalc.tsx` | Pass province to calculation |
| `src/components/proposals/summary/CarbonCreditSection.tsx` | Extract and pass province |
| `src/components/proposals/summary/carbon/carbonCalculations.ts` | Accept optional province |
| `src/components/quick-calc/QuickCalcResults.tsx` | Show yield factor used |
| `supabase/functions/send-calculator-results/index.ts` | Fix 1300 to 1642.50, fix 0.93 to 1.0334 |

---

## What Does NOT Change

- Carbon factor (1.0334 tCO2/MWh) stays the same nationally
- Client share percentages, agent commissions, carbon pricing -- all unchanged
- Existing proposals with no province data continue using the 1,642.50 national average
- Database schema for `proposals`, `onboarding_fields` etc. -- no changes
- All backward compatibility maintained (province parameter is optional everywhere)

---

## Future (Phase 2 Preview)

Phase 2 would add GPS-based lookup using the NASA POWER API via an edge function, using the `system_gps_lat` and `system_gps_lng` already captured in `onboarding_fields`. This would give site-specific yields rather than provincial averages. The regional table from Phase 1 would remain as a fallback.

