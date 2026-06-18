
# Referral Proposal Flow — Fixes & Enhancements (v2)

## 1. Fix client share % bug (60.20% vs 68.25%)

**Root cause:** `supabase/functions/create-referral-proposal/index.ts` calculates `clientShare` from the agent's **company portfolio** (sum of all signed proposals by the company), so a small 10 kWp referral inherits the agent's full-company tier (20–30 MWp → 68.25%).

The standard proposal flow (`src/services/proposals/unifiedProposalService.ts`) correctly uses the **client's own portfolio** for the client share %, and uses the company portfolio only for agent commission tier.

**Fix:**
- Sum `system_size_kwp` from existing non-deleted proposals for the same `client_reference_id`.
- `totalClientPortfolio = existingClientKWp + system.size_kwp`
- `clientShare = calcClientShare(totalClientPortfolio)` → 10 kWp → **60.20%** ✓
- Keep `agentCommission` based on company portfolio (current behaviour).
- Backfill: recompute `client_share_percentage` on any unsigned referral-created proposals (e.g. `ad5dc895…`).

## 2. Rebrand the invitation email

`supabase/functions/create-referral-proposal/index.ts` currently sends a plain inline-HTML email that doesn't match the Crunch Carbon brand. (The legacy `send-proposal-invitation/email-service.ts` uses a golden-gradient template that also drifts from brand.)

**Fix:** Build one shared on-brand email template (`supabase/functions/_shared/brand-email.ts`) and use it from the referral function:
- Brand colours from `src/index.css` tokens (deep green primary, off-white surface, gold sparingly).
- Header with Crunch Carbon wordmark on solid brand band — no rainbow gradient.
- Clean system-font typography, 600px max width, table-based layout, inline styles, `#ffffff` body bg.
- Sections: greeting → project summary card → primary CTA → what-happens-next → why-am-I-receiving-this → 10-day validity → signature → dark footer with support email.
- Same template wrapper will be reused for the installer emails in #4.

## 3. Pre-signature data capture (reuse existing onboarding fields)

We are NOT adding new columns. The four required pieces already live in `public.onboarding_fields`:
- `system_address` (+ `system_gps_lat`/`system_gps_lng`)
- `commissioning_date`
- `installer_company_name`
- `installer_email` (and `installer_id` linking to `public.solar_installers`)

Today these are filled during the post-signature onboarding step (`PostSignatureOnboardingModal` → `/onboarding`). For referral-sourced proposals we shift these four into a **pre-signature step** so the signature panel is gated on them.

**Fix:**
- New `ProjectDetailsStep` component inserted into `src/pages/ProposalAcceptance` between the summary/terms and the signature panel.
- On submit it **upserts a `project_onboarding` row** for the proposal (if not already present) and **upserts the matching `onboarding_fields` row** with `system_address`, `system_gps_lat`, `system_gps_lng`, `commissioning_date`, `installer_company_name`, `installer_email` (using existing `google-places-autocomplete` for address).
- Autosave on blur so partial fills survive reload.
- "Sign & Accept" stays disabled until all four validate (Zod client-side).
- `accept-proposal` re-validates server-side that those four fields exist on `onboarding_fields` for the proposal; reject the sign if missing.
- The post-signature onboarding flow stays untouched — those fields will simply already be filled and the remaining technical fields (panels, inverters, costs, etc.) still get collected from the installer/agent later.

## 4. Post-signature installer invitation & notification

When a referral proposal is signed (in `accept-proposal` or as a follow-up step in `post-signature-automation`), use `onboarding_fields.installer_email` (collected in step 3) to:

1. Look up the installer in `public.solar_installers` (case-insensitive on `email`).
2. **If not found:** insert a new `solar_installers` row (`company_name = installer_company_name`, `created_by = agent_id`), set `onboarding_fields.installer_id` to it, then send an **invitation email** that:
   - Invites them to join the Crunch Carbon installer programme.
   - Explains the **annuity commission** (default 4%, pulled from `system_settings` so admins can tune without redeploy).
   - Shows worked examples computed server-side at send time using current carbon price + emission factor + 4% share — e.g. "A typical 100 kWp system earns you ~R X,XXX per year for the life of the project" and "A 1 MWp portfolio ~R XX,XXX per year".
   - Mentions earning more by referring/onboarding clients themselves.
   - CTA: "Accept your installer invitation" with a one-time token.
3. **If already on platform:** send a lighter notification — "Your client {clientName} has just signed up for carbon credits. Help complete onboarding (system size, panels, inverter serials, costs) here → {link}".
4. Both emails use the shared on-brand template from #2.
5. Log the send in `proposal_automation_log` (`installer_invitation` / `installer_notification`).

## 5. Verification

- Trigger referral flow with a 10 kWp system → confirm `client_share_percentage = 60.20`.
- Send a test invitation email → visually verify brand match in Gmail + Outlook.
- Walk a test client through acceptance → Sign disabled until project details + installer details supplied; confirm `onboarding_fields` row is written.
- Sign with (a) new installer email and (b) existing installer email → two different emails, new `solar_installers` row created in (a), `installer_id` linked in both, `proposal_automation_log` rows present.

## Technical Details

- **Files to edit:**
  - `supabase/functions/create-referral-proposal/index.ts` (share calc + new email template)
  - `src/pages/ProposalAcceptance/index.tsx` (+ new `components/ProjectDetailsStep.tsx`)
  - `supabase/functions/accept-proposal/index.ts` (server-side required-field check; trigger installer flow)
  - `supabase/functions/post-signature-automation/index.ts` (alternative trigger point)
- **New files:**
  - `supabase/functions/send-installer-invitation/index.ts`
  - `supabase/functions/_shared/brand-email.ts` (shared on-brand HTML wrapper)
- **DB migration:** none required — `onboarding_fields` and `solar_installers` already have everything. Optional one-off `UPDATE` (via insert tool) to backfill `client_share_percentage` on unsigned referral proposals.
- **Config:** installer annuity % stored in `system_settings` (`installer_commission_percentage`, default 4).
