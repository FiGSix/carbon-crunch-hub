# Remove /game link and add WhatsApp referral

## 1. Remove the broken "Got Game?" nav entry

`src/components/layout/Header.tsx` (lines 247–251): delete the `{ label: "Got Game?", href: "/game", ... }` object from the public nav array. No route or page exists for `/game`, so nothing else has to be removed.

## 2. New shared WhatsApp invite helper

Create `src/lib/referral.ts` exporting:

- `buildReferralUrl(refId?: string)` → returns `https://crunchcarbon.com/calculator` plus `?ref=<id>` when a signed-in client id is available, otherwise the plain site URL.
- `buildWhatsAppShareUrl(message: string)` → returns `https://wa.me/?text=<encoded>` (works on mobile and desktop WhatsApp Web).
- `defaultInviteMessage(url: string)` → the same friendly copy already used in `src/pages/Referral.tsx` line 44 ("Howzit! I've been using a company called Crunch Carbon…"), so tone stays consistent across surfaces.

This keeps referral logic in one place and lets the existing `/referral` page adopt it later without behaviour change.

## 3. Floating WhatsApp share button on every page

New component `src/components/referral/FloatingShareButton.tsx`:

- Fixed position, bottom-right (`fixed bottom-6 right-6 z-50`), circular button using the existing WhatsApp brand green with a white WhatsApp glyph (lucide `MessageCircle` icon is fine — no new deps).
- Uses `useAuth()` (already used elsewhere, e.g. `src/pages/Referral.tsx`) to detect a signed-in client and, when present, include their `?ref=<profile.id>` in the share URL; otherwise sends the generic site link.
- On click:
  - Mobile / desktop with WhatsApp installed → opens `wa.me` deep link in a new tab.
  - Also copies the invite URL to clipboard as a fallback and shows a toast ("Invite link ready to share").
- Small tooltip / `aria-label` "Invite a friend on WhatsApp" for accessibility.
- Hidden on a small deny-list of routes where a floating button would get in the way: `/login`, `/register`, `/verify-email`, `/forgot-password`, `/reset-password`, `/auth/callback`, `/force-logout`, and any `/admin/*` route. Implemented with a `useLocation()` check inside the component so no route files need editing.

Mount it once in `src/App.tsx`, inside the top-level layout that wraps `<Routes>` (same level as the existing `<Toaster />`), so it appears on every page without touching individual pages.

## 4. Post-calculator results share CTA

The calculator results view is rendered in `src/pages/calculator/` (same folder as the `CalculatorForm.tsx` edited previously). Locate the component that renders the estimated-earnings / results summary after a successful calculation and, directly under the headline result, add an inline card:

- Heading: "Know someone with solar? Share the cash."
- One line of copy: "Send them your invite on WhatsApp — takes 5 seconds."
- Primary button: green WhatsApp-styled "Share on WhatsApp" that calls the same helper from step 2 (uses tracked `?ref=` link when signed in, generic link otherwise).
- Secondary text link "Copy link" that copies the URL and toasts confirmation.

This CTA is inline (part of the results layout), separate from the floating button, and only appears once the user has actually seen a result — highest-intent moment.

## 5. Verification

- Type check and production build.
- Playwright: load `/` anonymously → floating button visible, click opens `wa.me/?text=…crunchcarbon.com…`. Load `/login` → button hidden. Load `/calculator`, submit a calculation → results screen shows the share CTA.

## Out of scope

- No changes to `/referral` page itself, referral tracking backend, or `PartnerReferralLandingPage`.
- No new dependencies; uses existing lucide-react icons, shadcn `Button`, and the existing toast system.
