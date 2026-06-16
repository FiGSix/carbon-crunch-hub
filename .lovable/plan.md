# Referral landing page refresh + company logo upload

## 1. Referral landing page visual refresh

**File:** `src/pages/PartnerReferralLandingPage.tsx` (visual-only, no data/logic changes)

Apply the dark Crunch Carbon palette throughout:
- Page background `#0a0a0a`, body text `text-zinc-100`, muted `text-zinc-400`
- Cards/sections `bg-[#141414]` with `border border-[rgba(245,197,24,0.15)]`
- Primary accent `#F5C518` (yellow) used for CTAs, step badges, counters, focus rings, icon tints, progress fill, success checkmark

**Top bar:** dark `bg-black border-b border-zinc-800`. Replace the "Crunch Carbon" wordmark with the **C logomark only**. Since `public/` contains only full lockups (`crunch-carbon-logo-new.png`, `company-logos/branding/crunch-logo-horizontal.png`), render an icon-only mark by clipping the lockup: a 36×36 square `overflow-hidden` wrapper showing only the leftmost C via `object-cover object-left` with a width large enough to align the C. (Alternative: upload a dedicated icon-only PNG via lovable-assets if the user provides one.)

**Hero:** full-width dark section with radial yellow glow overlay (`radial-gradient(ellipse at 50% -20%, rgba(245,197,24,0.15) 0%, transparent 70%)`). Headline `text-4xl md:text-6xl font-bold text-white` with one keyword wrapped in `text-[#F5C518]`. Floating proof cards `bg-zinc-900` with `border-l-4 border-[#F5C518]`. CTA `bg-[#F5C518] text-black hover:bg-[#FFD23F]` with the pulse keyframe below.

**Partner attribution card:** dark surface, avatar gets `ring-2 ring-[#F5C518]`.

**Progress bar:** `bg-zinc-800` track, yellow `indicator` fill (override shadcn `Progress` via className).

**Form steps:**
- Inputs/selects: `bg-zinc-900 border-zinc-700 text-white focus:border-[#F5C518] focus-visible:ring-[#F5C518]/40`
- Native `<select>` styled to match dark
- Step number badges: yellow circle, black text

**Results reveal (step 3):** background deepens to pure black; earnings counter large bold `text-[#F5C518]`; stat cards `bg-zinc-900` with yellow icon tints; amber disclaimer → `bg-amber-950 border-amber-800 text-amber-200`; eligibility box → `bg-zinc-900 border-zinc-700 text-zinc-400`.

**CTA pulse (injected once via styled-jsx or a global block in the page):**
```css
@keyframes ctaPulse {
  0%,100% { box-shadow: 0 0 0 0 rgba(245,197,24,0.5); }
  50%     { box-shadow: 0 0 0 16px rgba(245,197,24,0); }
}
.cta-pulse { animation: ctaPulse 2s ease-out infinite; }
```

**Success state:** `bg-black/90` overlay, yellow stroke checkmark, confetti palette `["#F5C518","#ffffff","#B8860B"]`, success card `bg-zinc-900 border-zinc-700`, sign-up button solid yellow with black text.

Respect `prefersReducedMotion` (already detected) — skip pulse and confetti when true.

## 2. Company logo upload on profile page

Already in place:
- `profiles.company_logo_url` column exists
- Storage bucket `company-logos` exists
- `CompanyLogoUpload` component exists and wraps the shared `ImageUpload` with that bucket
- `useProfileForm` already exposes `formData.companyLogoUrl` and `handleCompanyLogoChange`

What's missing: it's never rendered, and `ProfileForm` uses `useOptimizedProfileForm` which doesn't expose logo handlers, and only shows the company card for agents.

Changes:

**`src/hooks/useOptimizedProfileForm.ts`** — add `companyLogoUrl` to form state, load from `profile.company_logo_url`, save back as `company_logo_url`, and expose `handleCompanyLogoChange(url|null)`.

**`src/components/profile/CompanyInformationCard.tsx`** — accept `companyLogoUrl`, `onLogoChange`, `userId` props; render `<CompanyLogoUpload currentLogoUrl={companyLogoUrl} onLogoUpdate={onLogoChange} disabled={isLoading} />` above the company-name field, with label "Company Logo" and helper text "PNG, JPG or SVG up to 5 MB. Shown on your referral page."

**`src/components/profile/ProfileForm.tsx`** — show `CompanyInformationCard` for **both** agents and super partners (`isAgent || isSuperPartner`); pass the new logo props. Add `isSuperPartner` prop.

**`src/pages/Profile.tsx`** — pass `isSuperPartner` into `ProfileForm`.

No new bucket, no migration, no changes to landing-page data flow, edge function, referral attribution, or `ImageUpload`.

## Out of scope
Landing-page copy, calculator math, attribution logic, DB schema, edge functions, registration flow.

## Verification
- Visit `/ref/<token>` for an SP client link: dark theme renders, C mark shows in top bar, yellow CTA pulses, form fields are dark with yellow focus, results step shows yellow counter and dark stat cards, success overlay uses yellow confetti.
- `prefers-reduced-motion: reduce` disables pulse/confetti.
- As an agent on `/profile`: Company Information card shows logo uploader; upload writes to `company-logos` bucket and persists `company_logo_url`; reload shows logo; landing page renders that logo in the partner card.
- Same flow works as a super partner.
