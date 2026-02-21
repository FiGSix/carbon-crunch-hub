

# Add Regional Solar Yield Manager to System Settings

## Overview
Create a new admin component (`RegionalSolarYieldManager`) that lets admins view and edit the provincial solar yield values stored in the `regional_solar_yields` table, and add it to the System Settings page alongside the existing managers.

## UI Design
A card-based component matching the existing pattern (like `CarbonPriceManager`):
- Card title: "Regional Solar Yields"
- Card description: "Manage province-specific solar yield factors (kWh/kWp/year) used in energy calculations."
- A table listing each province with its current yield value in an editable input field
- Source column (read-only, showing where the data came from)
- A "Save Changes" button
- Loading skeletons while data is fetched
- Toast notifications for success/error feedback

## Changes

### 1. New File: `src/components/admin/RegionalSolarYieldManager.tsx`
- Follows the same pattern as `CarbonPriceManager` (useState for data, useEffect to load, save handler)
- Fetches all rows from `regional_solar_yields` table
- Displays provinces in a sorted table with editable yield inputs (numeric, step 0.1, min 0)
- Shows the source text alongside each province (read-only)
- Save button updates all changed rows via Supabase `.update()` calls
- Uses `toast` from sonner for feedback

### 2. Edit: `src/pages/SystemSettings.tsx`
- Import and render `RegionalSolarYieldManager` in the settings list (placed before `CarbonPriceManager` since they're related)

## Technical Details
- No database changes needed -- the table and RLS policies already exist
- The existing RLS allows authenticated users to read and admins to update, which is exactly what we need
- Updates use the Supabase client to update individual rows by `id`
- After saving, the `regionalYields.ts` cache is invalidated so calculations pick up new values immediately

