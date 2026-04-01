

# Consolidate Address Input to Map-Only + Add Proximity Warning Tiers

## Clarification

Both "Search Address" and "Pin Drop on Map" already use **Mapbox** (not Google). The `MapboxAddressAutocomplete` component calls the `mapbox-geocode` Supabase edge function. There is zero Google dependency in the address flow.

However, your broader point is valid: having two separate modes creates confusion and the "Search Address" mode can produce results without reliable GPS coordinates. Consolidating to the map picker (which already has its own search bar) ensures every project always has GPS coordinates, making conflict detection reliable.

## Plan

### 1. Remove dual-mode toggle, default to map view (`ProjectInfoForm.tsx`)
- Remove the `AddressInputMode` component and the `addressMode` state
- Always render `MapAddressPicker` as the sole address input
- Remove the `MapboxAddressAutocomplete` standalone usage and the `SelectedLocationDisplay` conditional block
- The `MapAddressPicker` already has a built-in search bar, so users lose nothing

### 2. Add proximity warning tiers to conflict service (`addressConflictService.ts`)
- Keep the existing 50m hard conflict (blocks submission)
- Add two new **advisory** tiers in the return type:
  - **200m**: "Warning — another project is within 200m"
  - **500m**: "Notice — another project is within 500m"
- Update `AddressConflictResult` to include a `proximityLevel` field: `'conflict' | 'warning' | 'notice' | null`
- Update the loop: after checking the 50m threshold, continue scanning for the nearest project within 500m and return the closest match with its tier

### 3. Update conflict warning UI (`AddressConflictWarning.tsx`)
- Render different severity styles based on `proximityLevel`:
  - `conflict` (≤50m): red, blocks submission (existing behavior)
  - `warning` (≤200m): amber/orange, advisory only
  - `notice` (≤500m): blue/info, advisory only
- Show distance in meters for all tiers

### 4. Remove fallback address string matching (`addressConflictService.ts`)
- Since all projects will now have GPS coordinates (map picker is mandatory), remove the loose string-matching fallback (lines 143-161) that caused the false positive
- This eliminates the root cause of the "Mount Ashley Farming" issue entirely

### 5. Clean up unused components
- Delete `src/components/common/AddressInputMode.tsx` (no longer used)
- Remove `MapboxAddressAutocomplete` import from `ProjectInfoForm.tsx`
- Remove `SelectedLocationDisplay` import and usage from `ProjectInfoForm.tsx`

## Files Changed
- `src/components/proposals/project-info/ProjectInfoForm.tsx` — remove dual mode, always use MapAddressPicker
- `src/services/addressConflictService.ts` — add 200m/500m tiers, remove string fallback
- `src/components/proposals/project-info/AddressConflictWarning.tsx` — tiered severity UI
- Delete `src/components/common/AddressInputMode.tsx`

## Summary
- No Google code exists — both modes are already Mapbox
- Consolidating to map-only ensures GPS coordinates are always captured
- Three-tier proximity system: 50m (block), 200m (warn), 500m (notice)
- Removes the loose string matching that caused false positives

