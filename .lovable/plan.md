

# Consolidate Address Input: Remove Google Maps, Use Mapbox Only

## Why

The proposal form currently uses two mapping services for the same job:
- **Google Maps**: address autocomplete text search (3 edge functions, 7+ frontend files)
- **Mapbox**: pin-drop map, forward/reverse geocoding (1 edge function, 2 frontend files)

Both provide address search and GPS coordinates. Consolidating to Mapbox removes a redundant paid dependency and simplifies the codebase significantly.

---

## What Changes

### 1. New Component: `MapboxAddressAutocomplete`

Replace `SecureGoogleAddressAutocomplete` with a new Mapbox-powered autocomplete input that:
- Calls the existing `mapbox-geocode` edge function with `operation: 'forward'` as the user types
- Shows a dropdown of address suggestions (debounced, like the current Google version)
- On selection, returns the address string + GPS coordinates
- Falls back gracefully if the Mapbox API is unavailable

### 2. Update `ProjectInfoForm.tsx`

- Replace `SecureGoogleAddressAutocomplete` import with the new `MapboxAddressAutocomplete`
- Simplify the address flow: both "search" and "map" modes now use the same Mapbox backend
- When a user selects an address from autocomplete, GPS coordinates are captured automatically (no separate pin-drop needed, though the map picker remains as an option for rural locations)

### 3. Update `mapbox-geocode` Edge Function

- Add a `search` operation that returns multiple results (for autocomplete suggestions), distinct from the current `forward` operation that returns a single best match
- Return an array of `{ address, lat, lng }` objects for the autocomplete dropdown

### 4. Delete Google Maps Files

**Edge functions to delete (3):**
- `supabase/functions/google-maps-health-check/`
- `supabase/functions/google-place-details/`
- `supabase/functions/google-places-autocomplete/`

**Frontend files to delete (7+):**
- `src/components/common/SecureGoogleAddressAutocomplete.tsx`
- `src/components/common/GoogleMapsHealthMonitor.tsx`
- `src/components/common/GoogleMapsMessages.tsx`
- `src/components/common/GoogleMapsStatusIndicator.tsx`
- `src/components/common/address-autocomplete/AddressAutocompleteInput.tsx`
- `src/components/common/address-autocomplete/PredictionsList.tsx`
- `src/components/common/address-autocomplete/useAddressAutocomplete.ts`
- `src/hooks/useSecureGoogleMaps.ts`
- `src/components/testing/GoogleMapsIntegrationTest.tsx`

### 5. Update References

- `ProjectInfoStep.tsx`: Remove Google Maps error handling references
- Any System Settings or testing pages referencing Google Maps health checks
- Remove `GOOGLE_MAPS_API_KEY` secret (can be done later via Supabase dashboard)

---

## Files Summary

| Action | File |
|---|---|
| **New** | `src/components/common/MapboxAddressAutocomplete.tsx` |
| **Edit** | `supabase/functions/mapbox-geocode/index.ts` (add autocomplete operation) |
| **Edit** | `src/components/proposals/project-info/ProjectInfoForm.tsx` (swap component) |
| **Edit** | `src/components/proposals/ProjectInfoStep.tsx` (remove Google error handling) |
| **Edit** | `src/pages/SystemSettings.tsx` (remove Google health monitor if present) |
| **Delete** | 3 Google edge functions |
| **Delete** | ~8 Google-related frontend files |

---

## What Does NOT Change

- `MapAddressPicker` (the interactive pin-drop map) stays as-is -- it already uses Mapbox
- `useMapboxGeocoding` hook stays as-is
- The `mapbox-geocode` edge function stays, just gets an additional operation
- All GPS coordinate capture logic remains the same
- Address conflict detection (50m threshold) is unaffected
- No database changes needed

---

## Technical Details

The new `MapboxAddressAutocomplete` component will:
- Use a debounced input (300ms) to call `mapbox-geocode` with `operation: 'autocomplete'`
- The edge function will call Mapbox Geocoding API with `autocomplete=true` and `country=za` (South Africa)
- Display results in a dropdown list styled to match the existing UI
- On selection, call `onChange` with the full address and emit GPS coordinates via the existing `gpsData` pattern
- Show loading state and error handling matching current UX patterns

