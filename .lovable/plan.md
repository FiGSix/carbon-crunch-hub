## Goal

Make `/calculator` show the Rand earnings estimate on the page immediately after the user fills in system size + commissioning date. Demote name/email to optional fields for those who also want a full report emailed.

## Current behavior

- `CalculatorForm.handleCalculate` requires `name` + `email`, then calls the `send-calculator-results` edge function which emails a link. `onResultsCalculated` is never called from this flow, so `CalculationResults` (the Rand table) never renders inline.
- Only the live "Your System Size: X kWp" preview shows on the page.
- Homepage marketing promises: "Free • Takes 30 seconds • No signup required."

## Changes

### 1. `src/pages/calculator/CalculatorForm.tsx`

- Make `name` and `email` optional. Remove the red asterisks and the two `toast.error` guards for name/email. Keep an email-format check only when the user actually typed something.
- Split the single "Calculate + email" action into two stages:
  - **Primary CTA "Calculate My Earnings"** — validates panels/wattage (or kWp) + commissioning date, runs `calculateResults(...)` locally, then calls `onResultsCalculated(...)` so `Calculator.tsx` swaps in `<CalculationResults />` with the full Rand-per-year table. No email required, no network call.
  - **Secondary CTA "Email me the full report"** — enabled only when name + valid email are filled. Calls the existing `sendResultsMutation`. On success show the existing success state (or an inline "Report sent to X" confirmation) without hiding the on-page results.
- Reframe the name/email block with a heading like "Want the full report emailed to you too? (optional)" and helper copy. Move it below the calculate button, or keep it in place but visually de-emphasized.
- `emailSent` full-screen takeover: keep it only for the email path when the user isn't already viewing inline results; otherwise show inline success toast + inline confirmation so the Rand table stays visible.
- Update the disabled logic on the primary button to depend only on system-size + commissioning date validity.

### 2. `src/pages/Calculator.tsx`

- No structural change needed; it already renders `<CalculationResults>` when `showResults` is true. Just confirm the reset flow still clears form state.

### 3. `src/pages/calculator/CalculationResults.tsx`

- Add an optional inline "Email me this report" affordance (reuses `useSendCalculatorResults`) so users who first see results can still request the email without going back. Small form: name + email + send button. Uses the same `systemSize` / `commissioningDate` already in props. Non-blocking.

### 4. Homepage copy sanity check

- The "Free • Takes 30 seconds • No signup required" claim now matches reality, so no copy change needed. (If we want, we can also update the promo blurb to mention the optional email report — flag only, not required.)

## Out of scope

- Changing the underlying carbon math, pricing tiers, or edge function.
- Removing the email edge function or its rate-limiting.
- Advanced-mode UX beyond the required/optional relabeling.
- Auth, storage, or DB changes.

## Technical notes

- `calculateResults` is already a pure client-side function in `@/lib/calculations/carbon` — no server round-trip needed for the inline result.
- Referral code capture (`localStorage.getItem('referralCode')`) stays wired to the email path only, since it's used server-side for attribution.
- Keep existing validation for commissioning date min (`2022-09-15`) and system size max (15,000 kWp).
