## Root cause: "Please fix the highlighted errors" with nothing highlighted

The Onboarding tab's "Number of Inverters" input renders `value={formData.inverter_quantity || ''}` with `placeholder="1"`. On projects like Weylandts Tyger Valley, `inverter_quantity` in `onboarding_fields` is `null`/`undefined`, so the input looks filled (grey "1") but is actually empty.

On submit, `getAllErrors` runs the schema rule `inverter_quantity: z.number().min(1)`, which fails and blocks the submit with the toast "Please fix the highlighted errors before submitting." However:

- The **Inverter section badge** (`getSectionCompletionInfo('inverter')`) only counts the row-level fields (brand/model/capacity/serial), not `inverter_quantity`, so the section shows green.
- The **ValidationSummary** is shown, but `inverter_quantity` isn't in `touched`, and the `SectionBadge` doesn't flag it — the user sees no red highlight anywhere, only the toast.

The overall progress bar reports 100% because it only tallies sections, all of which report complete.

## Changes

### 1. Fix "Number of Inverters" input (`src/pages/ProjectOnboardingDetail/OnboardingTab.tsx`)

- Change the placeholder from `"1"` to `"Number of Inverters"` (uses default muted placeholder colour, matching the other inputs).
- Stop the silent auto-coerce to `1` on empty. When the field is cleared, set `inverter_quantity` to `undefined` so validation can fire.
- Add red border + `FormError` when the field has an error, even before it's been blurred, once the validation summary has been shown (i.e. use `errors.inverter_quantity` instead of `touched.inverter_quantity && errors.inverter_quantity` after a failed submit — same pattern used elsewhere).
- Extend `getSectionCompletionInfo('inverter')` to also require `inverter_quantity` (positive integer) so the section badge turns amber and shows "1 field remaining" when it's blank. Update the `total`/`remaining` math accordingly.
- On failed submit in `handleValidateAndComplete`, mark all fields present in `allErrors` as touched (so the inline red borders/messages appear) in addition to showing the ValidationSummary. This closes the general class of "toast fires but nothing is highlighted".

### 2. Remove duplicate buttons in Data Access Configuration card (`src/pages/ProjectOnboardingDetail/DataAccessTab.tsx`)

- Delete the `<div className="flex gap-3 pt-4">…Save Draft…Submit for Audit…</div>` block (lines ~515–532) and the now-unused `handleSaveDraft` / `handleSubmitForAudit` handlers, plus the `isSavingDraft`, `isSubmitting`, `canSubmit` state referenced only by those buttons.
- Keep the connection-test flow and field validation — the page-level footer (Onboarding tab) already provides "Save Draft" and "Submit for Audit" / "Validate & Mark Complete".

### 3. Green badge on the Onboarding tab when audit-ready (`src/pages/ProjectOnboardingDetail/index.tsx`)

Replace the current single "Incomplete" badge on the Onboarding `TabsTrigger` with a three-state badge, mirroring the Agreement tab styling:

- `project.audit_ready` → green badge "Audit Ready"
- else `project.onboarding_complete` → neutral badge "Complete"
- else → amber/orange badge "Incomplete"

## Technical notes

- The schema rule `inverter_quantity: z.number().min(1)` stays as-is; we only change the UI so an empty value round-trips as `undefined` and gets caught + surfaced.
- The `!canSubmit` gating currently on the Data Access card's Submit button is redundant with the page-level submit's `getAllErrors` check (which already covers Data Access via the `dataAccess` section), so removing the card buttons doesn't loosen validation.
- No database migration required.

## Files touched

- `src/pages/ProjectOnboardingDetail/OnboardingTab.tsx`
- `src/pages/ProjectOnboardingDetail/DataAccessTab.tsx`
- `src/pages/ProjectOnboardingDetail/index.tsx`
