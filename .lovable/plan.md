# Plan: Update /calculator Commissioning Date Field

## Goal
Change the calculator's "Commissioning Date" field so it is blank by default, shows the placeholder "Select the date your system was installed", and cannot be submitted until the user actively picks a date.

## Files to change
- `src/pages/calculator/CalculatorForm.tsx` (primary change)
- Optionally `src/pages/Calculator.tsx` (only to remove unused `today` / initial state if needed)

## Changes

### 1. Replace native date input with Shadcn Datepicker
A native `input type="date"` does not render placeholder text, so the field will be replaced with the existing Shadcn Popover + Calendar Datepicker (already available in `src/components/ui/popover.tsx` and `src/components/ui/calendar.tsx`).

- Keep the existing label "Commissioning Date" and red asterisk.
- Use a `Button` trigger styled as an input (`retro-input` class) that displays the placeholder when no date is selected and the formatted date (`dd MMM yyyy`) when one is selected.
- Add a calendar icon to the trigger for clarity.

### 2. Default to blank
- Change the `commissioningDate` state from a `string` initialized to today's date to `Date | undefined` initialized to `undefined`.
- Remove the unused `today` variable.
- The placeholder text will be: `Select the date your system was installed`.

### 3. Enforce minimum date
- The existing code has `min="2022-09-15"` on the date input.
- The Calendar component will receive the same lower bound via a `disabled` matcher (or `fromDate`) so users cannot pick a date before 15 September 2022.
- The existing clamping logic in `handleCalculate` (dates before 2025-01-01 are clamped) will remain unchanged.

### 4. Require a date before submission
- Update the `canCalculate` helper to include `!!commissioningDate` so the "Calculate My Earnings" button stays disabled until a system size and a commissioning date are both provided.
- Keep the existing `handleCalculate` validation as a defensive guard so a missing date still produces an error toast if reached.

## Verification
- Run the TypeScript type check after edits to ensure the `Date | undefined` state and Datepicker imports are correct.
- Visually verify in the preview that the date field starts blank with the placeholder, and the submit button is disabled until a date is selected.

## Out of scope
- No changes to other calculator pages such as `QuickCalculatorModal.tsx` or `EligibilityModal.tsx`.
- No changes to carbon-credit calculation logic or pricing.
- No changes to the optional email report section on the results page.