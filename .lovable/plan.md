## Scope

Frontend/presentation-only fixes for mobile viewports (375px & 414px). No business logic changes. The register and home pages review cleanly at both widths; all fixes below target the calculator page.

## Findings from mobile screenshots

1. **"Crunch the Numbers" pill badge wraps to two lines** on 375px — the absolutely‑positioned badge sits over a container with `px-4` padding, and the pill's text lacks `whitespace-nowrap`, so it wraps awkwardly.
2. **Commissioning Date button truncates** — placeholder "Select the date your system was installed" gets clipped ("installe…") on 375px. Text is too long for the trigger at mobile width.
3. **Dev-only `AuthStatusMonitor` widget overlaps the bottom of every page** in the mobile preview (fixed bottom‑right). It's gated to `import.meta.env.DEV` so it won't reach production, but it covers CTAs during mobile development/review. It should be hidden on small screens in dev too.
4. All primary CTAs (`Calculate My Earnings`, `Create Account`, `Start Earning`, `Calculate My Earnings` on home) already meet the 44px tap-target minimum — no changes needed there.
5. Register form's stacked full-width fields are fine on mobile; no cramping.

## Fixes

### `src/pages/calculator/CalculatorForm.tsx`
- Add `whitespace-nowrap` to the "Crunch the Numbers" pill's inner `<span>` (line ~135) so it stays on one line.
- Shorten the Commissioning Date placeholder on mobile: use a shorter label like `Pick installation date` (or split with `sm:` classes to keep the longer copy on larger screens). Also ensure the trigger's inner text has `truncate` so it never overflows if a locale renders long.

### `src/components/auth/AuthStatusMonitor.tsx`
- Add a `hidden sm:block` (or `md:block`) wrapper on the outer fixed container so the dev debug widget doesn't cover mobile content during preview/review. Production behavior is unchanged (still hidden entirely).

## Verification
- Re-run Playwright screenshots at 375 and 414 for `/`, `/calculator`, `/register`.
- Confirm the pill sits on one line, the date button shows the full placeholder, and no floating widget covers CTAs at mobile widths.
- Typecheck.

## Out of scope
- Any change to form logic, field set, validation, or the referral/share button (already positioned correctly, not overlapping form CTAs).
- Register and home page layouts (verified clean at both widths).
