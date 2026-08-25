# Tighten validation on the Onboarding "System Details" section

Today the System Details card turns green as soon as an address and a commissioning date exist. Everything else — ownership type, connection type, meter type, alternative power source, GPS, system name — is ignored by the completeness check, so a project looks finished while key audit inputs are still blank.

## What changes

System Details becomes complete only when all of these are answered:

- System Name (pre-filled from the proposal title when available)
- Ownership Type
- System Address (already required)
- Commissioning Date — or a date on every phase for multi-phase projects (already required)
- Connection Type
- Alternative Power Source — gains a "None / Not applicable" option so "not used" is an explicit answer rather than a blank
- Meter Type, plus the meter calibration certificate when "Dedicated Meter" is selected
- GPS Latitude and Longitude

Explicitly **not** required, as requested:

- EPC / Solar Installer Company Name
- EPC / Solar Installer Email (format still checked if something is typed)

## GPS handling

GPS coordinates are not captured anywhere earlier in the flow (they exist only on the onboarding record), so requiring them without help would create busywork. The field gets:

- A "Locate from address" action that geocodes the entered System Address using the existing Mapbox geocoding hook and fills lat/lng
- Manual entry / override always available, with the existing range checks (-90..90, -180..180)

System Name is pre-filled from the proposal title if the onboarding record has none, keeping it consistent with the existing name sync back to the proposal.

## Behaviour of the section state

- Each newly required field shows the `*` required marker and an inline error once touched and left empty.
- The section badge counts the real number of outstanding fields ("4 fields remaining") instead of only address + date, and the border/badge stays amber until all are answered.
- The overall progress bar and the "Validate & Mark Complete" / submit-for-review gate use the same rule, so the earlier "fix the highlighted errors" mismatch cannot reappear: every blocking field is visibly flagged inside the card.
- Existing projects that were already marked complete are untouched; the stricter check only affects what the card reports and what submission requires going forward.

## Technical notes

- `src/pages/ProjectOnboardingDetail/OnboardingTab.tsx`: extend the `system` branch of `getSectionCompletionInfo` to the full required list (single-phase and multi-phase variants), add required markers, blur handlers and `FormError` slots to the ownership/connection/alt-power/meter/GPS/name fields, add the "None / Not applicable" select item, add the geocode button, and prefill system name from the proposal.
- `src/lib/validation/onboardingSchema.ts`: add `validateField` cases for `ownership_type`, `connection_type`, `alternative_power_source`, `meter_type`, `system_name` (now required, still max 100 chars), and make `system_gps_lat` / `system_gps_lng` required-with-range; keep `installer_email` optional-format-only.
- `src/hooks/useOnboardingValidation.ts`: move the newly required names out of the `optionalFields` list into `requiredFields` inside `getAllErrors` so submission blocking and the card agree.
- `src/lib/validation/__tests__/onboardingSchema.test.ts`: extend coverage for the new required fields and the "None" alternative-power value.
