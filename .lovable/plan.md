
# AI Sales Agent for EPC Acquisition

A fully autonomous agent that runs continuously in the background to **discover**, **qualify**, **invite**, **onboard**, and **activate** EPC companies — measured on EPCs invited per week and EPCs that send their first client proposal.

Admin-only feature. Builds on the existing `agent_leads`, `lead_outreach_history`, `agent_invitations`, and onboarding infrastructure — no rip-and-replace.

---

## The funnel we're automating

```text
Discover EPCs  →  Enrich & Score  →  Outreach Sequence  →  Reply / Book
     ↓                  ↓                    ↓                  ↓
agent_leads      (web + AI)          lead_outreach_history    Invite
                                                                ↓
                                                         Onboarding nudges
                                                                ↓
                                                       First proposal sent ✓
```

The agent works one stage at a time on a cron, so failures in one stage don't block the others.

---

## Scope of this plan

Phase 1 (this build): Discovery + Outreach + Activation tracking, plus an admin "Sales Agent" workspace to supervise it.
Phase 2 (future, not in this plan): reply handling via inbound email, meeting booking, CRM-style task assignment.

---

## Sections to build

### 1. Sales Agent admin workspace
New route `/admin/sales-agent` (admin-only, gated by `has_role('admin')`). Four tabs:

- **Pipeline** — kanban of `agent_leads` by status with daily/weekly counters: discovered, contacted, replied, invited, signed up, first-proposal-sent.
- **Discovery** — list of `discovery_runs` (see schema below), each with source, query, # leads found, # net-new vs duplicates, cost, "Approve all / Reject all / Cherry-pick" actions before leads land in `agent_leads`.
- **Sequences** — manage outreach sequence templates (e.g. "EPC cold v1: day 0, day 3, day 7"), see per-template reply/click rates.
- **Settings** — toggles for autopilot (auto-approve discovery, auto-send outreach), daily send caps, allow/block domains, working hours.

### 2. EPC discovery engine
A scheduled edge function `sales-agent-discover` that runs daily and uses Lovable AI Gateway to find new EPC companies in target regions.

Input sources (configurable per run):
- Web search queries ("solar EPC contractors {region}", "C-10 solar licensed contractors {state}", etc.)
- Public solar industry directories (SEIA member list, regional installer lists) — scraped via AI extraction
- Optional: user uploads a CSV/URL of a directory and the agent enriches it

Pipeline per discovered company:
1. Dedup against `agent_leads.company_name` + domain.
2. Enrich: find website, contact email, location, est. portfolio size — using AI + web search.
3. **Score** (0–100) based on: portfolio fit, geography, reachable contact email, signs of activity (recent projects, hiring).
4. Insert into `discovery_runs.results` as candidates (NOT directly into `agent_leads`).

Admin reviews and approves → leads flow into `agent_leads` with `source = 'ai-discovery:{run_id}'`.

If "Autopilot" is on, leads above a score threshold auto-flow in.

### 3. Outreach sequencing
Replaces today's one-off `SendOutreachDialog` with multi-step cadences.

New table `outreach_sequences` defines a template (name, steps: [{day_offset, subject, body_template, cta}]).
New table `outreach_enrollments` tracks each lead's progress through a sequence (current_step, next_send_at, status).

Scheduled edge function `sales-agent-send` runs every 15 min:
- Picks enrollments where `next_send_at <= now()` and `status = 'active'`.
- Personalizes body using AI (company name, location, signals from enrichment).
- Sends via existing transactional email infra; logs to `lead_outreach_history` (already exists).
- Respects daily send caps and quiet hours from Settings.
- Halts a lead's sequence on: reply detected, bounce, unsubscribe, manual stop, or status moved to `qualified`/`converted`/`rejected`.

Personalization, send caps, and unsubscribe handling all build on existing `lead_outreach_history` + suppression tables.

### 4. Reply detection (lightweight, phase-1)
We don't need a full inbox. Detect replies two ways:
- **Email events webhook** — extend the existing email events handler: if Resend posts an inbound or a "replied" hint, flip the lead to `contacted → replied` and pause the sequence.
- **Manual mark** — admin can mark a lead as "Replied" in the Pipeline tab, which also pauses sequencing.

(Full reply parsing + AI auto-response is Phase 2.)

### 5. Conversion + onboarding hand-off
- One-click "Convert to invitation" on a replied/qualified lead (already exists via `ConvertLeadDialog`) — but extend it to also enroll the lead in an **onboarding nudge sequence**.
- `sales-agent-nudge` cron: every 24h, finds invited agents whose onboarding is stalled and sends targeted reminders (e.g. "You're 3 of 8 sections done — finish to start earning"). Stops when agent reaches Audit Ready.

### 6. Activation tracking — the metric that matters
A view `v_sales_agent_funnel` joins:
- `agent_leads` → `agent_invitations` → `profiles` (accepted) → `project_onboarding` (audit_ready) → `proposals` (first proposal sent by that agent)

Powers a top-of-page scoreboard on the Sales Agent workspace:
**Discovered → Contacted → Replied → Invited → Signed up → Audit Ready → First proposal sent**, with conversion % between each step and a week-over-week trend.

This is what tells you the agent is actually working — not vanity outreach counts.

---

## Technical details

### New database tables (via migration)

```text
outreach_sequences      (id, name, is_active, steps jsonb, created_at)
outreach_enrollments    (id, lead_id, sequence_id, current_step, next_send_at,
                         status, paused_reason, created_at)
discovery_runs          (id, source, query, status, started_at, completed_at,
                         leads_found, leads_approved, cost_cents, error,
                         created_by)
discovery_candidates    (id, run_id, company_name, website, email, contact_name,
                         location, score, enrichment jsonb, status, dedup_match_id)
sales_agent_settings    (singleton row: autopilot_discovery, autopilot_outreach,
                         daily_send_cap, quiet_hours_start/end, score_threshold,
                         blocked_domains text[], target_regions text[])
sales_agent_runs        (id, job_name, started_at, completed_at, status, stats jsonb)
```

All RLS: `has_role(auth.uid(), 'admin')` only. No anon, no agent access.

### New edge functions
- `sales-agent-discover` — cron daily; uses Lovable AI Gateway + web search to find + enrich + score EPCs.
- `sales-agent-send` — cron every 15 min; processes due outreach enrollments.
- `sales-agent-nudge` — cron daily; sends onboarding nudges to stalled invited agents.
- `sales-agent-manual-trigger` — admin-invoked, runs any of the above on demand.

All three crons scheduled via `pg_cron` + `pg_net`.

### Reuse, don't rebuild
- `agent_leads` — primary lead table (no schema change).
- `lead_outreach_history` — every send logged here regardless of source.
- `AgentInvitationDialog` + `ConvertLeadDialog` — conversion UI.
- Transactional email infra + suppression — existing.
- Onboarding 8-section flow — unchanged, just nudged.

### Frontend
- New folder `src/pages/admin/sales-agent/` with `index.tsx` + tab components.
- New folder `src/components/admin/sales-agent/` for DiscoveryRunCard, SequenceBuilder, FunnelScoreboard, AutopilotToggle, etc.
- Add nav entry in admin sidebar gated by `isAdmin`.

### Secrets needed
- `LOVABLE_API_KEY` (already present) — for AI enrichment/personalization.
- Web search: prefer the existing websearch infra; if a paid key is needed (e.g. SerpAPI), ask before adding.

---

## Open questions to confirm before build

1. **Target regions** — which countries/states should discovery target first?
2. **Autopilot default** — should outreach send automatically or always require admin approval per batch in v1?
3. **Daily send cap** — what's a safe ceiling per day to protect domain reputation (suggest 50/day to start)?
4. **Sequence length** — 3-touch or 5-touch sequence to start?
