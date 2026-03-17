

# Round system sizes to max 3 decimal places throughout the app

## Problem
Floating-point arithmetic produces values like `148.79999999999998 kWp`. The central `formatSystemSize` function rounds MWp to 3 decimals but applies **no rounding** to kWp values. Additionally, several components display sizes inline without using the central formatter at all.

## Root Fix

**File: `src/services/calculations/carbon/formatting.ts`** (the single source of truth)

Change line 8 from:
```
return `${sizeKwp} kWp`;
```
to:
```
return `${parseFloat(sizeKwp.toFixed(3))} kWp`;
```

`parseFloat` strips unnecessary trailing zeros (e.g. `149.000` → `149`, `148.800` → `148.8`).

This automatically fixes every component that uses `formatSystemSizeForDisplay` — which includes ProposalList, ProposalDetails, RevenueDistributionSection, PortfolioInfo, RecentProjects, dashboard metrics, and the proposal summary.

## Inline displays that bypass the formatter

These need individual fixes to add `.toFixed(3)` or use the formatter:

1. **`src/components/proposals/project-info/ProjectPhasesInput.tsx`** line 123: `totalSize.toFixed(2)` → `totalSize.toFixed(3)`
2. **`src/components/proposals/view/ProjectInfoSection.tsx`** line 31: raw `{projectInfo.size || "0"} kWp` → use `formatSystemSizeForDisplay` or `parseFloat(Number(projectInfo.size || 0).toFixed(3))`
3. **`src/pages/calculator/CalculatorForm.tsx`** line 318: `calculatedSystemSize.toFixed(2)` → `calculatedSystemSize.toFixed(3)`
4. **`src/pages/solar-rewards/QuickCalculatorModal.tsx`** line 358: `calculatedSystemSize.toFixed(2)` → `calculatedSystemSize.toFixed(3)`
5. **`src/pages/business/BusinessCalculator.tsx`** line 33: raw `${kWp} kWp` → `${parseFloat(kWp.toFixed(3))} kWp`
6. **`src/components/admin/agents/AgentDetailsDialog.tsx`** line 219: already `.toFixed(2)` for MWp → change to `.toFixed(3)`

## Summary
- 1 core fix in the formatter (covers ~15 components automatically)
- ~6 inline display fixes for components that bypass the formatter
- No database or data model changes

