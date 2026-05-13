# Phases 2 & 3 — Agent Weekly Roundup

Phase 1 is complete and validated:
- Dynamic pricing wired to `system_settings` (parity with dashboard).
- Modular split: `blockers.ts`, `links.ts`, `agentEmail.ts`, thin `index.ts`.
- Categorised blockers (client / agent / Crunch) with missing items, owner, and per-blocker resolve buttons.
- Header CTAs (Dashboard, Add Proposal, Resolve Blocked, Follow Up Pending).
- Test send to `shaun@crunchcarbon.com` returned 200, 1/1 sent.

Recommendation: proceed. Phase 2 delivers the commercial uplift agents will feel immediately; Phase 3 layers intelligence and learning on top.

---

## Phase 2 — Make It Commercial

Goal: every number tells a revenue story; every blocker shows the rand cost of inaction.

### 2.1 Week-on-week deltas
- New table `agent_weekly_snapshots` (one row per agent per run).
  Stores: audit-ready MWp, onboarding MWp, pending-signature MWp, signed-this-week MWp, new-proposal count, est. commission 2026, est. commission 2025–2030.
- New module `agent/deltas.ts`: read previous snapshot, compute Δ vs this week, expose `{value, delta, direction}` for each metric.
- Snapshot write happens at end of every successful run.
- First run after deploy = "baseline week" (deltas hidden gracefully).

### 2.2 Proposal funnel
- New module `agent/funnel.ts` joining `email_events` × `proposals` for the agent:
  - Created this week
  - Viewed (first open)
  - Multi-viewed (≥3 opens, not signed) — strong follow-up signal
  - Viewed but not signed (>7 days)
  - Expiring within 7 days
  - Signed this week
- Render as a 6-cell funnel with counts + direct "Follow up" CTA per row (deep-link to filtered proposals view).

### 2.3 Revenue lens
- Replace single revenue figure with four numbers, all using dynamic pricing:
  1. Short-term revenue 2026 (audit-ready × 2026 price × share)
  2. Long-term revenue 2025–2030 (cumulative)
  3. **Revenue locked behind blockers** (sum MWp of blocked projects × pricing)
  4. **Revenue pending signature** (sent-not-signed proposals)
- Numbers 3 and 4 are the new wedge — they monetise inaction.

### 2.4 Personal vintage impact
- Filter agent's onboarding-stage projects against the next vintage cutoff.
- For each at-risk project: list missing items + resolve button.
- Headline: "X MWp of yours can still make Vintage YYYY if resolved by DD MMM."

### 2.5 This Week's Focus
- New module `agent/focus.ts`: scoring function over blockers + pending + funnel.
  Score = MWp × revenue-per-MWp × (1 / effort-to-resolve).
- Picks the single highest-impact action and renders a hero block at the top of the email with: project, what's missing, who acts, deadline, primary CTA, secondary "view all".

### Phase 2 exit criteria
- All four revenue numbers reconcile with dashboard.
- Snapshot table populated for every agent after first run.
- Focus block always present (falls back to "add a new proposal" when no blockers/pending exist).

---

## Phase 3 — Make It Intelligent

Goal: the email adapts to who the agent is and what changed, and we learn what works.

### 3.1 7-segment classifier
Replace the 3-tier segmentation with: `new_agent`, `activated`, `stuck` (no activity 21 d), `growing`, `top_performer`, `at_risk_pipeline` (high pending, low conversion), `audit_momentum`.
Each segment maps to subject line, opening line, focus weighting, and CTA priority via a single config map.

### 3.2 Milestones engine
Detects threshold proximity (e.g. "0.4 MWp from 10 MWp audit-ready"), streaks (3 consecutive weeks signing), and team rank changes. Renders as a small badge row above the focus block.

### 3.3 Team section upgrade
- Team deltas (this week vs last).
- Agent's contribution % to team.
- Nearest peer ahead/behind by audit-ready MWp (motivational, no leaderboard exposed in full).

### 3.4 Rotating content block
One slot at the bottom rotating by `weekNumber % 4`: tip / customer story / new feature / objection-handler. Static content registry, no CMS needed.

### 3.5 A/B subject testing + CTA tracking
- New table `email_cta_events` (email_send_id, agent_id, cta_type, target_url, variant, clicked_at).
- All CTA links tagged with `?utm_email=weekly&utm_cta=...&utm_variant=A|B`.
- Random A/B subject assignment per send, variant logged.
- Resend webhook (already in project for delivery events) extended to log opens + clicks into `email_cta_events`.
- Weekly admin report adds: open rate, CTR per CTA type, winning variant.
- **Dependency:** Resend click-tracking must be enabled on the sending domain. If disabled, ship 3.1–3.4 only and flag 3.5 as blocked.

### Phase 3 exit criteria
- Two agents in different segments receive visibly different emails (subject + opening + focus).
- `email_cta_events` records at least one click within 24 h of first live send.
- Admin email surfaces A/B + CTR.

---

## Sequencing & risk

- Phase 2 ships in one PR per sub-section (2.1 → 2.5) so each can be verified in isolation against the dashboard.
- Phase 2.1 is the only DB migration in this batch.
- Phase 3 ships after Phase 2 is live for one full weekly cycle (so we have a real snapshot baseline + funnel data before layering segmentation on top).
- Admin email remains untouched throughout.
- Email size: cap every list at top 5 with "…and N more — open dashboard" to keep render under Gmail's 102 KB clip threshold.

## Files & migrations

**Phase 2**
- New migration: `agent_weekly_snapshots` table.
- New: `send-weekly-roundup/deltas.ts`, `funnel.ts`, `focus.ts`, `revenue.ts`, `vintageImpact.ts`.
- Edit: `agentEmail.ts` (new sections), `index.ts` (snapshot write).

**Phase 3**
- New migration: `email_cta_events` table + Resend webhook handler edit.
- New: `segmentation.ts`, `milestones.ts`, `rotatingContent.ts`.
- Edit: `agentEmail.ts` (segment-driven copy), admin email (A/B reporting).
