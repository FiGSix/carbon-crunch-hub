

# Remove phase sizes from System Details section

## Problem
The System Details section shows editable size (kWp) inputs per phase, but this data is already captured in the Solar Panels section via `panel_total_kwp`. Entering sizes in both places is redundant.

## Changes

**File: `src/pages/ProjectOnboardingDetail/OnboardingTab.tsx`**

1. **Remove the "Size (kWp)" column** from the multi-phase grid (~lines 840-853). Change the grid from `grid-cols-3` to `grid-cols-2` — keeping only the phase name label and the commission date input.

2. **Update the section header** (~line 820): Change from `"Commission Dates & Sizes (Multi-Phase Project)"` to `"Commission Dates (Multi-Phase Project)"`.

3. **Update the tooltip** (~line 827): Change to `"Edit the commission date for each phase. Changes will sync back to the proposal."`.

4. **Remove the total size summary row** below the phases (around lines 869-880) if it exists, since sizes are no longer displayed here.

5. **Keep `sizeKWp` in `phases_json` data** — no changes to the data model or save logic. The size values remain stored and synced; they're just not editable in this section since panel details handle system sizing.

No database changes. One file modified.

