# Referral link system

End-to-end referral attribution: every partner gets a personal `/ref/<token>` link. Clients land on a mobile-first page, fill a 3-step assessment, and instantly receive a signable proposal. Super Partners get an agent-recruitment variant. All clicks/signups/conversions are tracked.

## 1. Database migration (single migration)

**New tables**
- `referral_links` — `owner_id`, `token` (unique, 12-byte hex default), `link_type` (`client`|`agent`), `is_active`, `clicks`, `signups`, `conversions`. Indexed on `token` and `owner_id`.
- `referral_events` — `referral_link_id`, `event_type` (`click`|`signup`|`conversion`), `user_id` (nullable), `metadata` jsonb. Indexed on `(referral_link_id, event_type)`.

**Profiles columns**
- `referred_by_link_id` → `referral_links(id)`
- `referred_by_agent_id` → `profiles(id)`
- `referral_bio` text, ≤300 chars

**Backfill** referral links for all existing active agents (`client` type) and super partners (`agent` type).

**SECURITY DEFINER RPCs**
- `get_referral_partner_info(token)` — returns partner card data, increments `clicks`, logs `click` event. Returns `{valid:false}` for invalid/inactive tokens.
- `apply_referral_on_signup(token, new_user_id)` — sets `referred_by_*` on profile, for agent-type links also calls `ensure_agent_has_company` + inserts pending `super_partner_link_requests`, increments `signups`, logs `signup` event.
- `log_referral_conversion(user_id)` — increments `conversions`, logs `conversion` event when the user's profile has a `referred_by_link_id`.

**Trigger updates**
- `handle_new_user()` — after profile insert, auto-create a `referral_links` row when `role IN ('agent','super_partner')` (`ON CONFLICT DO NOTHING`).
- `handle_proposal_signing_commissions` — after commission inserts, call `log_referral_conversion(client_profile_id)` if that profile has `referred_by_link_id`.
- Any DB trigger/email hook that fires on proposal → `'sent'` must early-return when `content->>'referral_created' = 'true'` to prevent duplicate emails.

**Grants & RLS**
- `referral_links`: `authenticated` SELECT own row (`owner_id = auth.uid()`), UPDATE own row's `is_active`; admins full. `service_role` ALL. No `anon` (RPC handles public read).
- `referral_events`: owners read own link's events; admins full. `service_role` ALL.

## 2. Edge function `create-referral-proposal`

Public (no JWT). Body: `{ token, client:{name,email,phone?}, system:{size_kwp, property_type, province, has_existing} }`.

Flow: validate token → rate-limit (≥3 proposals for this email in 24h → 429) → upsert `clients` by normalised email → `ensure_agent_has_company(owner_id)` → compute `client_share_percentage` (60.20 base), `agent_commission_percentage` (company override or MWp tier), `annual_energy`, `carbon_credits` using existing helpers → insert proposal `status='sent'`, `agent_id=owner_id`, `company_id=resolved`, `content.referral_created=true` → send proposal email to client (signing link) CC partner → bump `signups`/`conversions` and log both events → return `{ success, proposal_id, annual_energy, carbon_credits }`.

CORS via `npm:@supabase/supabase-js@2/cors`. Zod validation on body.

## 3. Public landing page `src/pages/PartnerReferralLandingPage.tsx`

Route in `src/App.tsx`: `<Route path="/ref/:token" element={<PartnerReferralLandingPage />} />` — outside auth guard.

On mount: `get_referral_partner_info(token)`. Invalid → "This link is no longer active." `link_type='agent'` → store token in localStorage and `navigate('/register')` immediately.

**Mobile-first (375px design target). Non-negotiables:**
- Single column below `md`; CTAs `w-full` min-h 52px; inputs `text-base` (16px iOS no-zoom).
- Bottom-pinned nav: `fixed bottom-0 left-0 right-0; padding-bottom: env(safe-area-inset-bottom)`.
- Native `<select>` for province + property type.
- Partner card stacks vertically; stats 1-col mobile / 3-col `md`+.
- Desktop floating proof cards → mobile static horizontal scroll strip.
- QR lazy-loaded on tap (`qrcode.react` dynamic import).
- Confetti 30 mobile / 60 desktop; burst 12 / 30. Success card = bottom sheet on mobile.
- `loading="lazy"` on avatar/logo.
- `prefers-reduced-motion`: skip counter, particles, confetti; fade-in final values.

**OG/Helmet** via `react-helmet-async` (already installed): per-token `og:title`, `og:description`, `og:image` (partner avatar or `/og-default.png`), `og:url`, `twitter:card=summary_large_image`. Provider already mounted at root (verify; add if missing).

**Static asset** `public/og-default.png` — Crunch Carbon logo on dark bg with tagline "Find out what your solar earns." (generated via imagegen, premium tier for legibility).

**Steps**
1. About you — name (req), email (req), phone.
2. Your system — solar status, kWp, province (native select), property type.
3. Results reveal — client-side `calculateAnnualEnergy` + `calculateCarbonCredits`, no API. Sequence: dark gradient → label fade → counter 0→value 1.5s easeOut → 🌱 tonnes + ⚡ MWh stagger → particle burst → bg restore → amber "conservative estimate" disclaimer → grey eligibility box. **No percentages shown.** CTA "Get my free proposal" with `ctaPulse` keyframe glow.
4. Success — call edge fn; on success: overlay → animated checkmark (stroke-dashoffset 600ms) → confetti → bottom sheet/centred card with summary + "(conservative estimate)" + 1s-delayed sign-up prompt → `Sign up` → `/register?email=&ref=`, plus "Maybe later" link.

Step transitions: `framer-motion` `AnimatePresence` (already installed), 300ms slide L↔R.

## 4. Registration flow

- On page load: if `?ref=<token>` → store `{token}` in `localStorage.crunchcarbon_ref`. Pre-fill email from `?email=`.
- On successful signup: read stored ref → `rpc('apply_referral_on_signup', {p_token, p_new_user_id})` → clear localStorage.
- SP→agent path: post-signup banner "You've been invited to join [SP Name]'s partner network — your request is pending admin approval." (Resolve SP name from the link's owner profile.)

## 5. `ReferralLinkWidget` (`src/components/referral/ReferralLinkWidget.tsx`)

Props: `linkType: 'client' | 'agent'`. Fetch own row; if missing show **Generate my link** button (insert row). UI: read-only URL, **Copy** (2s "Copied!"), **Preview** (new tab `/ref/<token>`), **Show QR** (lazy `qrcode.react` 160×160 + Download PNG), **Share** (Web Share API w/ copy fallback). Stats row Clicks · Signups · Conversions — re-fetch every 30s. Subtitles per `linkType` as specified.

Mount on partner dashboard (`linkType="client"`) and super partner dashboard (`linkType="agent"`).

## 6. Partner profile settings — bio

Add Textarea (max 300, char counter) → `profiles.referral_bio`. Label + helper text per spec.

## 7. Admin — referral links overview

New section in admin panel: table Owner · Role · Link Type · Clicks · Signups · Conversions · Status · Created. Row click → drawer with event log (date · type · user email). Toggle `is_active`.

## 8. Preserved unchanged

All existing proposal pages, signing/commission flow, company logic, auth flows, route paths, snapshot rows. Referral proposals appear in the partner's existing list as `Sent`.

## Files

**Create**
- `supabase/migrations/<ts>_referral_system.sql`
- `supabase/functions/create-referral-proposal/index.ts`
- `src/pages/PartnerReferralLandingPage.tsx`
- `src/components/referral/ReferralLinkWidget.tsx`
- `src/components/referral/PartnerAttributionCard.tsx` (small extract used by landing + preview)
- `public/og-default.png`

**Modify**
- `src/App.tsx` — public `/ref/:token` route
- `src/main.tsx` — ensure `HelmetProvider` mounted (verify first)
- Registration page + form hook — `?ref`/`?email` handling, post-signup `apply_referral_on_signup`, SP banner
- Partner dashboard + Super Partner dashboard — mount widget
- Partner profile settings page — `referral_bio` textarea
- Admin panel routing + new admin page for referral links
- `handle_new_user` trigger and `handle_proposal_signing_commissions` trigger (in migration)

## Verification

1. Click `/ref/<token>` on mobile width — clicks counter increments; partner card renders; OG tags present.
2. Submit 3-step form — proposal created with `status='sent'`, `content.referral_created=true`; client receives signing email; partner CC'd; no duplicate trigger email.
3. Sign proposal from email without an account — succeeds; `log_referral_conversion` fires; `conversions` increments.
4. Register via `/ref/<agent-token>` → redirected to `/register`; on signup `apply_referral_on_signup` runs, `super_partner_link_requests` row pending, banner shown.
5. Partner widget shows live counters (clicks/signups/conversions). Admin can deactivate a link → public page shows "no longer active".
6. `prefers-reduced-motion` honoured; iOS Safari no input zoom; QR only loads on tap.
