
# Sales Agent — Full Autonomy Plan (A–F)

Goal: turn the Sales Agent into a true closed loop — Discovery → Outreach → Replies → Meetings → **Drafted first proposal** — with Shaun reviewing only at high-leverage moments.

```text
discover-leads (cron)  ─►  pending candidates  ─►  auto-promote (≥threshold)
        │                                                  │
        ▼                                                  ▼
   agent_leads ──► sales-agent-send (cron) ──► outreach sequence
                                                        │
                              ┌─────── inbound poll ────┘
                              ▼
                  classify-reply ──► draft-reply (auto-send if conf ≥ X)
                              │
                              ▼
                  meeting_booked / interested+enriched
                              │
                              ▼
                  sales-agent-draft-proposal  ──►  proposals row (status=draft)
                              │
                              ▼
                  notify Shaun to review & send
```

---

## A. Schedule Discovery (`discover-leads`)

- `discover-leads` currently requires `{ query, location, limit }`. Wrap it with a new lightweight cron entry point that iterates a configurable list of **discovery presets** (e.g. `EPC solar installer` × `Gauteng / Western Cape / KZN / Eastern Cape`).
- New table `sales_agent_discovery_presets` (query, location, limit, active, last_run_at).
- Cron: **daily 06:00 SAST** — calls `discover-leads` once per active preset; respects `daily_send_cap`-style budget to avoid Firecrawl overrun.
- Seed 4–6 presets from current `target_regions`.

## B. Schedule Outreach (`sales-agent-send`)

- Cron: **every 15 min, 07:00–18:00 SAST, Mon–Fri**.
- Existing function already loops due active enrollments, respects `daily_send_cap` and quiet hours — just needs to be invoked on a timer.
- Add a guard: if `autopilot_outreach=false`, function exits early (so the kill-switch keeps working).

## C. Schedule Follow-up Nudges (`sales-agent-nudge`)

- Cron: **daily 09:00 SAST**.
- Function already exists for onboarding nudges; no code change, just schedule.

## D. Auto-promote candidates above threshold

- Add a final pass inside the new discovery-cron wrapper: after each discovery run, select `discovery_candidates` where `status='pending'` and `score >= score_threshold`, then call `promote_discovery_candidate` for each (this RPC already exists, used today by `sales-agent-rescore`).
- Gated by `autopilot_discovery` flag (already true).
- Logs each promotion into `candidate_notes` as a system event.

## E. New: `sales-agent-draft-proposal` (the first-proposal handoff)

The missing bridge from Sales Agent → Proposals module.

**Trigger conditions** (any of):
1. `agent_leads.status` transitions to `meeting_booked`, OR
2. `agent_leads.status='replied'` AND classified intent = `interested` AND lead has email + company + location (enriched).

**Behavior**
- New edge function `sales-agent-draft-proposal` invoked by:
  - DB trigger on `agent_leads.status` change (calls via `pg_net`), and
  - `sales-agent-classify-reply` after a confident `interested` classification.
- Resolves/creates a `client` from `agent_leads` company + contact + email + location.
- Inserts a `proposals` row with:
  - `status='draft'`
  - `agent_id` = Shaun
  - `title` = `"Carbon-credit proposal — {{company_name}}"`
  - `source='sales_agent'` (new column — small migration)
  - linked `lead_id` (new FK column on proposals — small migration)
- Writes a `candidate_notes` entry: *"Drafted proposal {id} from lead {x}"*.
- Idempotent: if a draft proposal already exists for the lead, no-op.
- Does **not** send the proposal — Shaun reviews/sends from the existing Proposals admin UI.
- On success: triggers `sales-agent-notify` with a `proposal_drafted` event.

## F. Reply autopilot policy

- Keep `autopilot_replies=false` by default (Shaun reviews).
- Add an explicit setting `autopilot_reply_min_confidence` (default 90) — even when autopilot is on, only auto-send above this bar; below it, save as draft for review.
- Update `sales-agent-draft-reply` to honour both flags. UI toggle already exists in Settings; expose the new threshold slider next to it.

---

## New cron schedule summary

| Job | Schedule | Calls |
|---|---|---|
| `discovery-daily` | `0 4 * * *` (06:00 SAST) | wrapper → `discover-leads` per preset + auto-promote |
| `outreach-send-15min` | `*/15 7-18 * * 1-5` | `sales-agent-send` |
| `nudge-daily` | `0 7 * * *` (09:00 SAST) | `sales-agent-nudge` |
| `poll-inbound-5min` | unchanged | `poll-inbound` |
| `notify-15min` | unchanged | `sales-agent-notify` |

---

## Schema changes (single migration)

- `proposals` — add `source text default 'manual'` and `lead_id uuid references agent_leads(id) on delete set null` (+ index).
- `sales_agent_discovery_presets` — new table (query, location, limit_count, active, last_run_at, created_at).
- `sales_agent_settings` — add `autopilot_reply_min_confidence smallint default 90`.
- Trigger `agent_leads_status_to_proposal_trg` on `agent_leads` (AFTER UPDATE OF status) that `pg_net.http_post`s to `sales-agent-draft-proposal` when the new status qualifies.

## Frontend changes (minimal — keep this PR small)

- `SettingsTab.tsx`: add "Discovery presets" editor (add/remove/toggle) + autopilot reply confidence slider.
- `PipelineTab.tsx` / Lead drawer: badge "Proposal drafted" with deep-link to the proposal.
- `Sequences`/Discovery tabs unchanged.

## Out of scope (intentionally)

- Sending the first proposal automatically (kept human-in-the-loop).
- Cross-lead deduping beyond what `discover-leads` already does.
- Re-engagement of `rejected` / `bounced` leads.

---

## Roll-out order

1. Migration (proposals.source + lead_id, presets table, settings field, trigger).
2. New edge function `sales-agent-draft-proposal` + extend `discover-leads` cron wrapper (could be a new `discovery-cron` function).
3. Schedule the three new cron jobs (separate insert migration, since it references the anon key).
4. Frontend Settings additions.
5. Smoke test: insert a preset, invoke `discovery-cron` once manually, watch a candidate auto-promote → enroll → send (manually trigger send cron) → simulate reply → confirm draft proposal appears.
