## Problem
`public/crunch-carbon-logo-new.png` is stored as base64 text rather than binary PNG data, so it does not render in browsers. Additionally, both logos in the referral top bar need to be 20% larger.

## Fix

1. **Decode the logo file** — Read the base64 content of `public/crunch-carbon-logo-new.png`, decode it, and overwrite the file with the actual binary PNG data.
2. **Resize logos** — In `src/pages/PartnerReferralLandingPage.tsx`, change both logos from `h-10` to `h-12` (48 px, a 20% increase from 40 px). All other styling (white filter, `object-contain`, conditional partner logo) remains unchanged.

No other files or logic are touched.