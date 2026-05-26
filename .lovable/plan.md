# Sales Agent Learning Loop — Build Plan

Goal: make outreach emails get sharper over time by measuring what works, routing sends to winning variants, and feeding winning examples back into the AI reply drafter.

Built in 4 phases so each is shippable on its own.

---

## Phase 1 — Variants + per-variant tracking

**Schema (migration)**
- `outreach_template_variants`
  - `id`, `sequence_id`, `step_index` (int), `subject`, `body_template`, `cta_label`, `cta_url`
  - `weight` (numeric, default 1.0), `status` ('active' | 'paused' | 'retired')
  - `created_by`, `created_at`, `notes`
- Backfill: for each existing `outreach_sequences.steps[i]`, insert one variant row (status active, weight 1).
- `lead_outreach_history`: add `variant_id uuid null` + index.
- `outreach_replies`: add `variant_id uuid null` (so replies can be attributed to the variant that triggered them).
- RLS: admin-only write, read for authenticated admins (mirror `outreach_sequences`).

**Editor UI**
- Extend `SequencesTab.tsx`: under each step show its variants, with add/edit/pause/retire actions. Inline subject + body editor (textarea + token helper for `{{first_name}}` etc.).

---

## Phase 2 — Variant stats + dashboard

**View**: `v_outreach_variant_stats` materialised, refreshed by cron every 15 min.
Columns per `variant_id`:
- `sent`, `delivered`, `opened`, `clicked`, `replied`, `positive_replies` (classified interested/question), `meetings_booked`, `bounced`, `unsubscribed`
- Rates: open_rate, reply_rate, positive_reply_rate, meeting_rate
- `last_sent_at`, `sample_size_ok` (bool, e.g. ≥30 sends)

Joins: `lead_outreach_history` → `outreach_replies` → `inbound_messages` → existing email-event tables (`email_opens`, `email_clicks` if present — verify during exploration).

**UI**: new `LearningTab.tsx` under Sales Agent admin
- Table per sequence/step showing variant performance with a confidence indicator
- Winner badge on the top variant once `sample_size_ok`
- Manual "promote" / "retire" buttons that update `status` and `weight`

---

## Phase 3 — Bandit picker in send

Replace single `step.body_template` read in `sales-agent-send/index.ts` with:
1. Load active variants for `(sequence_id, step_index)`.
2. Weighted random pick using Thompson-sampling-lite: `score = beta(positive_replies+1, sent-positive_replies+1)` sample; fall back to uniform when no stats yet.
3. Record chosen `variant_id` on `lead_outreach_history`.

**Auto-tune job** (`sales-agent-tune`, cron daily):
- For each step with ≥2 active variants and ≥30 sends each: retire variants whose positive_reply_rate lower-bound (Wilson) is below the leader's; bump leader's weight.
- Log decisions into `sales_agent_runs` for auditability. Never auto-create new variants — humans/AI write them.

---

## Phase 4 — Feedback into the AI drafter

Two loops:

**a) Reply drafter few-shot injection** (`sales-agent-draft-reply`)
- Before calling Gemini, pull top 3 `outreach_replies` where `status='sent'` AND led to a positive outcome (meeting booked or `agent_leads.status` advanced to qualified within 7 days).
- Inject as few-shot examples in the system prompt: "Examples of replies that worked well: …".
- Cache per-day in `system_settings` to keep cost flat.

**b) Human-edit signal**
- When an admin edits an AI draft before sending, diff `draft_body` vs `sent_body` and store on `outreach_replies.edit_distance` + `edit_summary` (LLM-generated 1-liner via Lovable AI).
- Surface "most-edited drafts" in LearningTab so the system prompt can be tightened.
- Weekly job summarises common edits into a short "style rules" string saved on `sales_agent_settings.ai_style_notes`, which the drafter prepends to its system prompt → the actual learning loop.

---

## Technical notes

- All new edge functions follow the standard CORS + service-role pattern used by existing `sales-agent-*` functions.
- All AI calls go through Lovable AI Gateway (`google/gemini-3-flash-preview` default; `google/gemini-2.5-pro` for the weekly style-rules summariser).
- pg_cron jobs: `refresh_variant_stats` (15m), `sales-agent-tune` (daily 03:00 UTC), `sales-agent-style-rules` (weekly Mon 04:00 UTC).
- No client-side changes to dashboards beyond the new LearningTab.
- Safe rollout: Phase 1 ships variants with bandit OFF (single-variant per step = today's behaviour). Bandit + tune turn on in Phase 3 behind `sales_agent_settings.autopilot_learning` flag (default true once Phase 2 has been observed for a week).

---

## Out of scope (can be follow-ups)
- Subject-line-only A/B (achievable today by creating variants that differ only in subject).
- Send-time-of-day experimentation.
- Per-segment (industry/region) variants — possible later by adding `audience_filter jsonb` to variants.
