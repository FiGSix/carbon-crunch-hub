

# Fix: Multi-Phase Client-Side Validation

## The Real Issue

The `commissioning_date` being NULL for multi-phase projects is **correct by design** — there is no single commissioning date when a project has multiple phases. Setting it to some arbitrary value would be the band-aid. The proper fix is making the client-side validation layer multi-phase-aware, matching what the server-side RPC already does.

The server-side `validate_onboarding_completion` RPC was already updated to handle this correctly: it checks `phases_json` dates instead of `commissioning_date` when a project is multi-phase. But the client-side `getAllErrors()` in `useOnboardingValidation.ts` was never updated to match, so it blocks submission before the RPC is ever called.

## Changes

**File: `src/hooks/useOnboardingValidation.ts`** — `getAllErrors` function (lines 86-98)

1. Detect multi-phase: check if `formData.phases_json` is a non-empty array
2. If multi-phase: remove `commissioning_date` from the required fields list, and instead validate that every phase in `phases_json` has a non-empty `commissionDate`
3. If single-phase: keep existing `commissioning_date` requirement (no change)

**File: `src/lib/validation/onboardingSchema.ts`** — no changes needed (field-level `validateField` for `commissioning_date` is only called when the field is in the required list)

This is a ~15-line change in one file. No database changes.

