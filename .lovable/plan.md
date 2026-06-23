## Problem

On the Proposal Summary page, when a proposal uses the new **kWh input mode** (per-year 2025–2030 values), the "Carbon Credit Projection" block renders empty:

- **Estimated Annual Energy** shows `0 kWh`
- **Estimated Annual Carbon Credits** shows `0.00 tCO₂`
- Each yearly row shows `0.00 MWh / 0.00 tCO₂e / R 0`, even though the **Total Client Revenue** at the bottom is correct (R 486,719).

## Root cause

`CarbonCreditSection.tsx` and `CarbonCreditTable.tsx` both still derive the displayed per-year MWh and tCO₂e from `systemSizeKWp` using the kWp × yield-factor formula:

- `systemSizeKWp` comes from `UnifiedCarbonService.normalizeToKWp(systemSize)`. In kWh mode the size field is empty, so `systemSizeKWp = 0`.
- Summary tiles call `calculateAnnualEnergy(systemSizeKWp)` → 0.
- `CarbonCreditTable` ignores the per-year revenue map and re-runs `calculateYearlyEnergy(systemSizeKWp, year, commissionDate)` + `calculateClientSpecificRevenue(...)` per row → all zeros.

Only the bottom **Total** row uses the kWh-mode totals already computed by `calculateFromAnnualKwh` in `services/calculations/carbon/core.ts`, which is why the total is correct but rows are not.

## Fix

Wire the kWh-mode results from `calculationResult` (already returned by `useRevenueCalculations`) through to the table and the summary tiles. No calculation-engine changes — the engine is already correct.

### 1. `src/components/proposals/summary/CarbonCreditSection.tsx`
- Detect kWh mode: `generationInputMode === 'kwh'` OR any value in `annualKwhByYear` / `phases[].annualKwhByYear` > 0.
- In kWh mode:
  - Use `calculationResult.systemSizeKwp` (the derived kWp) instead of the empty form value when passing `systemSizeKWp` down.
  - Build `preCalculatedYearlyMWh` from the per-year kWh (kWh ÷ 1000). Single-phase: from `annualKwhByYear`. Multi-phase: sum across `phases[].annualKwhByYear`.
  - Build `preCalculatedYearlyCredits` = MWh × `EMISSION_FACTOR` (1.0334).
  - Pass `preCalculatedYearlyRevenue = calculationResult.revenueByYear` so the table stops calling `calculateClientSpecificRevenue` and just renders the engine's revenue.
  - Replace the summary tiles' `calculateAnnualEnergy` / `calculateCarbonCredits` calls with `calculationResult.annualEnergyKwh` and `calculationResult.carbonCreditsPerYear`.
  - Hide the "pro-rated commissioning year" footnote in kWh mode (kWh values are used as-is).

### 2. `src/components/proposals/summary/carbon/CarbonCreditTableWrapper.tsx`
- Forward the new `preCalculatedYearlyMWh / Credits / Revenue` props in the single-phase branch (today only the multi-phase consolidated branch passes pre-calculated MWh/credits).
- For multi-phase kWh-mode phase cards: build per-phase pre-calculated maps from `phase.annualKwhByYear` and pass them to each phase's `CarbonCreditTable`.

### 3. `src/components/proposals/summary/carbon/CarbonCreditTable.tsx`
- Add optional `preCalculatedYearlyRevenue?: Record<string, number>` prop. When provided, skip the async `getFormattedClientSpecificCarbonPrice` + `calculateClientSpecificRevenue` calls and use the supplied revenue. The carbon-price column shows `—` (or the static published price) since pricing is already baked into the supplied revenue.
- Existing kWp-mode behaviour unchanged when the new prop is omitted.

### 4. Backwards compatibility
- All new props are optional. Existing kWp-mode proposals render exactly as before.
- No DB / edge-function changes.

## Out of scope

- Recomputing the historical persisted `totalClientRevenue` on proposals already saved with wrong row-level zeros (the total was correct; only display rows were wrong).
- Acceptance page / PDF — same pattern is already handled in those surfaces by earlier work; if the same symptom appears there, it will be addressed in a follow-up.
