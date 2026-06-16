## Top bar refinements on PartnerReferralLandingPage

### Goal
Clean up the referral landing page header so only the two logos remain, with a transparent background and white-treated logos.

### Changes

1. **Remove all partner text**
   - Drop partner name, company name, initials/avatar circle, and referral bio.
   - Keep only the Crunch Carbon C-mark on the left and the partner company logo on the right.

2. **Logo layout**
   - Crunch Carbon C-mark: left-aligned.
   - Partner company logo: right-aligned.
   - Both logos sized `h-10 w-auto object-contain`.
   - Both logos tinted solid white with the Tailwind arbitrary value `[filter:brightness(0)_invert(1)]`.
   - No logo shown on the right when `company_logo_url` is null.

3. **Background**
   - Replace the existing `bg-black border-b border-zinc-800` bar with `bg-gradient-to-b from-black/60 to-transparent backdrop-blur-sm`.
   - The page dark background (`#0a0a0a`) shows through.

4. **No other changes**
   - Progress bar and all page logic stay untouched.
