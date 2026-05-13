# Plan: Transform `send-weekly-roundup` Agent Email into a Sales-Performance Engine

## 1. Audit of current implementation

**File:** `supabase/functions/send-weekly-roundup/index.ts` (1,318 lines, monolithic).

**What exists today:**
- One file handles both agent and admin emails.
- Hardcoded `CARBON_PRICES` constant (2024–2030) — does NOT match `dynamicCarbonPricingService` used in the app.
- Hardcoded `PLATFORM_2026_GOAL_MWP = 250`.
- 3-tier segmentation only: `new` / `active` / `top_performer` based on tenure + signed MWp.
- `Blocker` type captures only `project_name`, `blocker_type`, `mwp` — no missing-item, no owner, no link.
- `WeekMovement` exists but no week-on-week metric deltas (no snapshot table).
- No proposal funnel data (views, multi-views, expiring, viewed-not-signed) — `email_events` table exists but is unused here.
- No deep-link helpers — buttons (where present) likely go to a generic dashboard.
- Vintage countdown is generic (platform-wide), not personal.
- No "This Week's Focus" section.
- No A/B test or CTA-click tracking.

**Available data (confirmed in schema):**
- `email_events` (event_type, click_url, occurred_at, proposal_id) — usable for funnel + CTA tracking.
- `proposals` (status, signed_at, created_at, updated_at, system_size_kwp, agent_id, client_reference_id).
- `project_onboarding` + `onboarding_fields` + `onboarding_documents` + `data_access_config` — usable to compute exact missing items per project.
- `clients`, `client_company_members` — for owner-of-action attribution.
- `vintageConfig` shared util — already integrated.
- `dynamicCarbonPricingService` lives in `src/lib/calculations/carbon/dynamicPricing.ts` (frontend). Need a Deno-compatible equivalent in `supabase/functions/_shared/`.

**Gaps requiring new infrastructure:**
- No `agent_weekly_snapshots` table → cannot compute week-on-week deltas reliably.
- No `email_cta_events` table (or extended `email_events` rows) for CTA click attribution.
- No shared Deno `carbonPricing.ts` util.

---

## 2. Recommended refactor & data model

### 2a. Refactor monolith into modules
Split `send-weekly-roundup/index.ts` into:
```
supabase/functions/send-weekly-roundup/
  index.ts                  // HTTP entry, orchestration only
  agent/
    metrics.ts              // queries + aggregation
    segmentation.ts         // 7-segment classifier
    blockers.ts             // categorised blockers w/ missing items + owner + link
    funnel.ts               // proposal funnel from email_events
    focus.ts                // "This Week's Focus" selector
    deltas.ts               // week-on-week from snapshots
    template.ts             // HTML composition
    links.ts                // deep-link builder
  admin/
    index.ts                // existing admin email, untouched logic moved here
  _shared/
    carbonPricing.ts        // dynamic pricing (replaces hardcoded const)
```
Admin email logic is moved verbatim, no behaviour change.

### 2b. New shared util — `_shared/carbonPricing.ts`
Reads from same source as `dynamicCarbonPricingService` (likely `system_settings` row `carbon_prices` or a `carbon_prices` table — to be confirmed during implementation). Exports `getCarbonPrices()` and `calculateRevenue(credits, sharePct, fromYear, toYear)`.

### 2c. New table — `agent_weekly_snapshots`
```
id, agent_id, snapshot_date,
audit_ready_mwp, onboarding_mwp, pending_signature_mwp,
signed_this_week_mwp, new_proposals_count,
estimated_commission_2026, estimated_commission_2025_2030
```
Written at the end of every weekly run; read at the start of next run for deltas.

### 2d. New table — `email_cta_events` (Phase 3)
```
id, email_send_id, agent_id, cta_type, target_url, clicked_at, variant
```
Populated via Resend webhook + URL param tagging (`?utm_email=weekly&utm_cta=resolve_project&utm_pid=...`).

### 2e. New segmentation (7 segments)
`new_agent`, `activated`, `stuck` (no activity 21d), `growing`, `top_performer`, `at_risk_pipeline` (high pending, low conversion), `audit_momentum`.
Each segment drives subject line, opening, focus block, and CTA priority via a config map.

---

## 3. Phased implementation

### **Phase 1 — Quick Wins** (deliver first)
1. Extract `_shared/carbonPricing.ts` and replace hardcoded `CARBON_PRICES`. Verify parity with dashboard.
2. Refactor monolith → modular structure (above). Admin email moved untouched.
3. Build `links.ts` deep-link helper (dashboard, proposal/:id, onboarding/:id, blocker actions).
4. Rewrite `Blocker` type + builder:
   - Adds `missing_items[]`, `action_owner: 'agent'|'client'|'crunch'`, `resolve_url`, `mwp`, `status`, `category`.
   - Source missing items from `onboarding_fields` (nulls), `onboarding_documents` (missing categories), `data_access_config` (missing creds), `cession_signed_at` IS NULL, etc.
5. Categorise blockers into the 3 sections (Client / Agent / Crunch) in template.
6. Add prominent header CTAs: Open Dashboard, Add Proposal, Resolve Blocked, Follow Up Pending.
7. Per-blocker action button.

**Exit criteria:** Email visibly action-led, all numbers match dashboard, every blocker shows missing item + owner + button.

### **Phase 2 — Make It Commercial**
8. Create `agent_weekly_snapshots` migration; write snapshot at end of run; compute deltas at start.
9. Add `funnel.ts`: query `email_events` joined with `proposals` for viewed-not-signed, multi-views, expiring-7d, signed-this-week, created-this-week.
10. Revenue lens: 2026 short-term + 2025–2030 long-term + revenue-locked-behind-blockers + revenue-pending-signature.
11. Personal vintage impact: filter agent's onboarding-stage projects against next vintage deadline; list each with missing items.
12. `focus.ts`: scoring function picking single highest-MWp-unlock action; render dedicated "This Week's Focus" block at top.

### **Phase 3 — Make It Intelligent**
13. New 7-segment classifier + per-segment subject/opening/focus/CTA config.
14. Milestones engine (threshold proximity, streaks, team rank).
15. Team section upgrade: deltas, contribution %, nearest peer.
16. Rotating content block (tip/story/feature/objection) — pick by `weekNumber % N`.
17. A/B subject testing: random variant assignment, log via `email_cta_events`; Resend webhook captures opens + clicks tagged with variant.

---

## 4. Risks & open questions

- **Pricing source confirmation** — need to verify exactly where `dynamicCarbonPricingService` reads from before writing the Deno equivalent (likely `system_settings`). Will inspect `src/lib/calculations/carbon/dynamicPricing.ts` first thing in implementation.
- **Snapshot bootstrap** — first run after deploy will have no prior snapshot → deltas show "baseline week" (graceful degrade per spec).
- **Email size** — adding funnel + per-blocker buttons can balloon HTML; cap each list at top 5 with "…and N more — open dashboard".
- **Deep-link routes** — need to confirm exact frontend routes for `/proposals/:id`, `/onboarding/:id`, blocker resolution pages. Will grep `src/pages` during Phase 1.
- **Admin email isolation** — must regression-test admin email after refactor (no behaviour change intended).
- **CTA tracking** requires Resend click-tracking enabled on the domain; if not, defer Phase 3.17.

---

## 5. What I will change in code (Phase 1 only, on approval)

- **New:** `supabase/functions/_shared/carbonPricing.ts`
- **New:** `supabase/functions/send-weekly-roundup/agent/{metrics,segmentation,blockers,template,links}.ts`
- **New:** `supabase/functions/send-weekly-roundup/admin/index.ts` (moved code)
- **Edit:** `supabase/functions/send-weekly-roundup/index.ts` → thin orchestrator
- **No DB migration in Phase 1.** First migration (`agent_weekly_snapshots`) lands at start of Phase 2.

Admin email behaviour unchanged. Agent email backward-compatible: any section lacking data is hidden, never shown empty.