## What's happening

**1. "Missing required project details" error**

The referral-acceptance page (`src/pages/ProposalAcceptance/index.tsx`) *does* render a `ProjectDetailsStep` block (system address, commissioning date, installer company, installer email) — but it's tucked **between Terms & Conditions and the Signature panel**, inside a long scrolling page. On the live proposal (`86d8a8da…`, `referral_created: true`), there is no:

- visible heading anchor or in-page nav pointing the client at it,
- "next step" banner after they scroll the T&Cs,
- visible blocker on the signature panel itself explaining *why* "Sign & Accept" is disabled.

So the client scrolls T&Cs → reaches the signature box → types name → clicks Sign → server rejects with "Missing required project details" with no idea what to fill in. The fields exist; the UX hides them.

**2. Emails are green, brand is yellow/black**

`supabase/functions/_shared/brand-email.ts` hard-codes a deep-green palette (`#0E5A3A` / `#0A4A30` / `#C8A24B` gold). The actual brand tokens in `src/styles/base.css` are **Crunch Yellow `hsl(45 100% 50%)` (`#FFC400`) on Crunch Black `hsl(0 0% 10%)` (`#1A1A1A`)**, white surface, light-grey borders. Every email sent through `renderBrandEmail` (referral invite + installer invite/notification) is off-brand.

## Fix

### A. Make the project-details step impossible to miss

In `src/pages/ProposalAcceptance/index.tsx`:

1. **Promote it above the Signature panel as a numbered step** with a clear heading: *"Step 1 of 2 — Confirm your project details"* / *"Step 2 of 2 — Review & sign"*. Render only for `isReferralProposal`.
2. **Add a sticky callout above the Signature panel** when `isReferralProposal && !projectDetailsValid(projectDetails)`:
   > "Before you can sign, please complete your project details above." with a "Jump to project details" button that scrolls to a new `#project-details` anchor.
3. **Disable the Sign button with an inline reason list** (already partly there) — explicitly list "Project details incomplete" alongside the existing "Scroll T&Cs / Tick agree / Type name" reasons, each as a checkable item, so the client sees exactly what's missing.
4. **Auto-scroll on click**: if the client presses Sign while project details are invalid, scroll to `#project-details` and flash the card border instead of silently no-op'ing.
5. **Fallback for clients on broken Mapbox**: `ProjectDetailsStep` currently relies on `MapboxAddressAutocomplete` (calls `mapbox-geocode` edge function). If that function errors, the autocomplete shows nothing and the client can't enter an address. Add a plain "Enter address manually" toggle inside `ProjectDetailsStep` that swaps in a regular `<Input>` and leaves lat/lng `null` (server already allows null coords).

### B. Rebrand the shared email wrapper to Crunch Yellow + Black

Rewrite `supabase/functions/_shared/brand-email.ts` palette and layout to mirror the app:

```text
primary       #FFC400  (Crunch Yellow, 45 100% 50%)
primaryInk    #1A1A1A  (Crunch Black, body text on yellow)
ink           #1A1A1A
inkMuted      #5C5C5C
surface       #FFFFFF
surfaceAlt    #FAFAFA  (card rows)
border        #E6E6E6
accent        #1A1A1A  (footer bar)
```

- Brand band: solid Crunch Yellow with black "Crunch Carbon" wordmark + black "Solar Carbon Credits" eyebrow (no green).
- CTA button: yellow bg, black text, black 1px border, 8px radius (matches in-app primary button).
- `brandCard` rows: white card on `#FAFAFA`, `#E6E6E6` border, black labels/values.
- Footer: black bar with white text and yellow link colour for the support email.
- Keep inline-CSS, 600px max, white body bg, Gmail/Outlook safe — no other structural changes, so `create-referral-proposal`, `send-installer-invitation`, and any other caller keep working with no signature change.
- Update `BRAND_COLORS` export so any caller reading it stays in sync.

### C. Verify

1. Open the live referral proposal `/proposals/86d8a8da…/accept?token=…` and confirm:
   - Step 1 (project details) is visible above the signature with the new heading and anchor.
   - Signature submit reason list shows "Project details incomplete" until filled.
   - Filling all four fields enables Sign, server accepts, no "Missing required project details" error.
   - Manual-address fallback works if Mapbox is unavailable.
2. Trigger a fresh referral invite (`create-referral-proposal`) and a fresh installer invite (`send-installer-invitation`) on a test address; visually confirm yellow/black brand in Gmail + Apple Mail. No green anywhere.

## Files

- **Edit** `src/pages/ProposalAcceptance/index.tsx` — reorder + numbered steps, sticky callout, scroll-to-anchor on disabled-submit, expanded reason list.
- **Edit** `src/pages/ProposalAcceptance/components/ProjectDetailsStep.tsx` — add `#project-details` anchor + "Enter address manually" fallback toggle.
- **Edit** `supabase/functions/_shared/brand-email.ts` — full palette + band + CTA + footer rebrand to Crunch Yellow/Black; export updated `BRAND_COLORS`.
- **Deploy** `create-referral-proposal`, `send-installer-invitation`, `accept-proposal` (only the shared module changes, but they must be redeployed to pick it up).

No DB migrations. No new dependencies. No business-logic changes — purely UX placement + email palette.