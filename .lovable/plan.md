## Problem

When editing a proposal in kWh mode, the save writes `content.projectInfo.annualKwhByYear` and `generationInputMode` correctly, and the edit dialog re-reads them — so the dialog "remembers" the values. But the proposal **view** never displays the new values because:

1. `ProposalDetails.tsx` gates the entire `CarbonCreditSection` / `RevenueDistributionSection` on `projectInfo.size || (isMultiPhase && phases.length>0)`. In single-phase kWh mode the save clears `size` to `''` and there are no phases, so **the whole carbon/revenue block disappears**.
2. Even when it does render (multi-phase kWh), `ProposalDetails` does **not** pass `annualKwhByYear` or `generationInputMode` down to `CarbonCreditSection` (the prop exists but is never supplied), so the table falls back to kWp-based calc against an empty `systemSize`.
3. `RevenueDistributionSection` is called with the same missing props, so revenue also stays on the old kWp path.

The save itself is fine — the bug is purely in how `ProposalDetails` reads the saved fields and forwards them.

## Fix (presentation only, no calc/business-logic changes)

**`src/components/proposals/view/ProposalDetails.tsx`**

- Treat the section as "has generation data" when any of these are true:
  - `projectInfo.size` is set, OR
  - multi-phase with phases, OR
  - `generationInputMode === 'kwh'` and `annualKwhByYear` has any value > 0, OR
  - multi-phase phases that contain `annualKwhByYear` entries.
- Pass the new props through to `CarbonCreditSection`:
  - `annualKwhByYear={projectInfo.annualKwhByYear}`
  - `generationInputMode={projectInfo.generationInputMode}`
- Pass the same two props to `RevenueDistributionSection` (add them to its prop type + forward into `useRevenueCalculations`, mirroring how `CarbonCreditSection` already does it).

**`src/components/proposals/summary/RevenueDistributionSection.tsx`**

- Extend the props with optional `annualKwhByYear` and `generationInputMode` and forward them into the existing `useRevenueCalculations` call (the hook already accepts `annualKwhByYear`).

**`src/components/proposals/view/ProjectInfoSection.tsx`**

- When `generationInputMode === 'kwh'`, render the per-year kWh grid (single-phase) or per-phase kWh rows (multi-phase) instead of the "X kWp" line, matching the layout already used in `summary/ProjectInformationSection.tsx`. Keep the kWp display for kWp mode unchanged.

## Out of scope

- No changes to `useProposalEdit`, save payload, DB schema, or calculation engine.
- No changes to creation flows, summary step, or PDF templates.

## Verification

After editing a proposal:
- Single-phase kWh save → reopen proposal → ProjectInfo shows yearly kWh rows, CarbonCreditSection and RevenueDistributionSection render and use the saved yearly kWh.
- Multi-phase kWh save → each phase shows its kWh grid; carbon/revenue tables reflect per-phase kWh.
- kWp mode behaves exactly as before.
