## Changes in `src/pages/PartnerReferralLandingPage.tsx`

1. **Upload the attached logo to Lovable Assets CDN** (the file is white-on-transparent, perfect for the dark top bar):
   ```
   lovable-assets create --file /mnt/user-uploads/CRUNCH-CARBON-LOGO-ALL-2.png --filename crunch-carbon-logo.png > src/assets/crunch-carbon-logo.png.asset.json
   ```
   This gives a stable CDN URL that bypasses the broken `/public/crunch-carbon-logo-new.png` file.

2. **Import and use the asset** for the Crunch Carbon logo in the top bar:
   ```tsx
   import crunchLogo from "@/assets/crunch-carbon-logo.png.asset.json";
   ...
   <img src={crunchLogo.url} alt="Crunch Carbon" className="h-12 w-auto object-contain" />
   ```
   The logo is already white in the source, so no filter is needed.

3. **Remove the white filter from partner logos** (both `company_logo_url` and `avatar_url` fallback):
   - Drop `[filter:brightness(0)_invert(1)]` from both `<img>` classNames.
   - Keep `h-12 w-auto object-contain` (and `rounded-full` on the avatar).

No other layout, data, or logic changes.