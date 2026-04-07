

# Backfill GPS Coordinates for Existing Proposals

## Current State

- **1,141** total proposals (non-deleted)
- **70** have GPS coordinates (6%)
- **1,021** have an address string but no GPS
- **50** have neither address nor GPS
- The `onboarding_fields` table has 257 records, 72 with GPS

## Approach: Edge Function Batch Geocoder

Create a new edge function `backfill-geocode` that an admin can trigger to forward-geocode all proposals missing GPS data using the existing Mapbox integration.

### How it works

1. **New edge function: `backfill-geocode`**
   - Admin-only (validates JWT + admin role)
   - Queries proposals where `project_info->>'address'` exists but `project_info->>'gpsLat'` is null
   - Processes in batches of 50 with a small delay between each Mapbox API call to respect rate limits
   - For each address, calls Mapbox forward geocoding (same logic as `mapbox-geocode`)
   - Updates `project_info` JSONB with `gpsLat`, `gpsLng`, and `addressSource: 'backfill'`
   - Skips records with blank/invalid addresses (e.g., "N/A", empty string)
   - Returns a summary: processed, succeeded, failed, skipped

2. **Also backfill `onboarding_fields`**
   - For records with `system_address` but no `system_gps_lat`/`system_gps_lng`, geocode and update those columns too

3. **Admin trigger UI**
   - Add a button on the admin settings or data management page
   - Shows progress and results after completion
   - One-click operation with confirmation dialog

### Technical Details

- **Rate limiting**: Mapbox allows 600 requests/minute on most plans. We'll add a 150ms delay between calls (~400/min)
- **Skipped addresses**: "N/A", empty strings, and addresses shorter than 5 characters will be skipped
- **Idempotent**: Only processes records missing GPS; safe to run multiple times
- **Service role**: The edge function uses `SUPABASE_SERVICE_ROLE_KEY` to update `project_info` JSONB directly

### Files

| File | Action |
|------|--------|
| `supabase/functions/backfill-geocode/index.ts` | New edge function |
| `src/pages/admin/DataManagement.tsx` (or similar admin page) | Add "Backfill GPS" button |

### Estimated Impact

~1,021 proposals will gain GPS coordinates, enabling accurate proximity-based conflict detection going forward.

