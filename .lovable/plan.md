
## Goals

1. Anyone who arrives via a Super Partner recruitment link is registered as a **Partner (agent)** — never as a client, even if they tamper with the URL or toggle the role picker.
2. In `Admin → Super Partner Management → Manage`, let admins set two per-SP overrides:
   - **SP commission %** — overrides the global 3% / 5% tier for this Super Partner.
   - **Default recruit commission %** — the % every agent recruited by this SP earns (e.g. AREP → 7%), overriding the 4% / 7% MWp default.

## 1. Force Partner role on super-partner links

Today `/ref/:token` already sends agent-recruitment links to `/register?role=agent&ref=…`, but `RegisterForm` still shows `RegisterRoleSelect`, so the user can flip to "Client" and get created as a client.

Frontend:
- `src/pages/Register.tsx` — when `?role=agent` **and** `?ref=` are both present (or when the stored `crunchcarbon_ref` entry has `link_type === "agent"`), pass a new `lockedRole="agent"` prop to `RegisterForm`.
- `src/components/auth/RegisterForm.tsx` — when `lockedRole` is set, hide `RegisterRoleSelect` and show a small "You're joining as a Partner via <SP name>" banner instead. Ignore any attempt to change `formData.role`.
- `src/pages/PartnerReferralLandingPage.tsx` — already stores `{ token, link_type: "agent" }`; keep as-is.

Server-side safety net (authoritative):
- Extend `public.apply_referral_on_signup` so that when `v_link.link_type = 'agent'` and the new user's profile role is `client`, it promotes the profile to `agent` (updates `profiles.role`, inserts into `user_roles`, clears any client-only fields) before calling `ensure_agent_has_company`. This closes the loophole for any client that was created before this fix or via a tampered URL.
- One-off backfill in the same migration: find profiles whose `referred_by_link_id` points at a `link_type='agent'` link but whose role is `client`, and promote them to `agent` + attach a company + create a pending `super_partner_link_requests` row.

## 2. Per-SP commission overrides

Data model (single migration):
- Add two nullable columns to `public.profiles` (only meaningful when `role='super_partner'`):
  - `sp_commission_override numeric` — overrides `get_super_partner_rate` for this SP.
  - `recruit_default_commission numeric` — default agent commission % for agents this SP recruits.
- Update `public.get_super_partner_rate(p_super_partner_id)` to return `sp_commission_override` when non-null; otherwise fall through to the existing tier1/tier2 logic.
- Update `public.handle_proposal_signing_commissions()` so the agent's base rate resolution becomes:
  1. `profiles.commission_override` on the agent (existing, highest priority — unchanged), else
  2. `profiles.recruit_default_commission` on the agent's linked super partner (new), else
  3. existing MWp-tier default (4% / 7%).
- Update `public.apply_referral_on_signup` so that when it promotes/attaches a new agent to a super partner, it also stamps `profiles.commission_override = <sp>.recruit_default_commission` on the new agent when the SP has one set. This means "all AREP partners immediately land on 7%".
- Backfill: for every existing agent linked to an SP with `recruit_default_commission` set and no `commission_override`, set their `commission_override` to the SP default (does not touch already-overridden agents).
- Existing `recalc_super_partner_rates` RPC continues to work — it already reads through `get_super_partner_rate` and rewrites `super_partner_commissions.commission_rate`.

Admin UI (`src/pages/AdminSuperPartnerManagement.tsx`, "Manage" panel):
- New "Commission overrides" section with two numeric inputs + Save:
  - "Super partner rate (%)" bound to `sp_commission_override` — placeholder shows the computed tier default.
  - "Default recruit rate (%)" bound to `recruit_default_commission` — placeholder shows "4% / 7% MWp default".
- Save flow: update `profiles` row, then call the existing `recalc_super_partner_rates` RPC so historical `super_partner_commissions` rows reflect the new SP rate immediately. Show a toast summarising rows updated.
- Optional helper button "Apply default to existing recruits" — runs a lightweight RPC that copies `recruit_default_commission` to `commission_override` for all linked agents without an existing override, then triggers a re-sync of `proposals.agent_commission_percentage` for their signed proposals (reuses the same pattern as `20260123163000` migration).

## Technical details

- `get_super_partner_rate` change is backward compatible; all existing callers (`handle_proposal_signing_commissions`, `recalc_super_partner_rates`, Admin UI) automatically pick up the override.
- No changes needed to `super_partner_commissions` schema — only the rate the trigger writes changes.
- `RegisterRoleSelect` stays untouched; the parent form just skips rendering it when the role is locked.
- Add `GRANT` for any new RPC introduced; existing tables already have grants.

## Out of scope

- No UI changes for how partners see their own rate (already surfaced via `SuperPartnerCommission` page which reads through `get_super_partner_rate`).
- No changes to the global tier defaults in `SuperPartnerCommissionTiers` — they remain the fallback.
