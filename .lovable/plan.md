# Simplify Cora CRM around Lead Completeness

Goal: turn the Command Centre into a usable CRM where every lead is graded on a 0–100 completeness score, and outreach is only allowed once a lead is genuinely complete. Reuse existing tables (`discovery_candidates`, `cora_decision_log`, `cora_mailbox_status`, `sales_agent_settings`), Outlook sender, and gating modules — no new infra unless required.

## 1. Database (one migration)

Extend `discovery_candidates`:
- `segment text` — `residential | commercial | agri | mixed | unknown`
- `completeness_score int` (0–100, generated or trigger-maintained)
- `completeness_missing text[]` — array of missing-field tags
- `research_status text` — New, Researching, Incomplete, Complete, Needs Review, Duplicate, Existing Agent, Existing Client, Not Fit, Do Not Contact
- `outreach_status text` — Ready, First Email Sent, Follow-Up Due, Follow-Up Sent, Replied, No Response, Paused
- `sales_status text` — Interested, Meeting Requested, Meeting Booked, Proposal Requested, Agent Invitation Sent, Signed Up, First Proposal Sent
- `location_country text`, `location_region text` (used by SA check)
- `fit_reason text`, `research_evidence jsonb`

Add a Postgres trigger `recalc_completeness()` that runs on insert/update and writes `completeness_score` + `completeness_missing` using the rubric:
- company_name 15, contact_name 15, contact_email 20, website 15, SA location 15, segment (not unknown) 10, fit_score ≥1 = 10.

Backfill once for existing rows.

## 2. Backend gates (reuse existing modules)

Update `supabase/functions/_shared/autoSendGate.ts` to require:
- `completeness_score >= 80`
- `contact_email` present
- `website` present
- SA location confirmed (`location_country = 'ZA'`)
- `segment` set and not `unknown` (mixed allowed)
- `fit_score >= 3`
- duplicate + existing-relationship check passes (already implemented)
- contact not blocked / unsubscribed / DNC
- mailbox = Outlook `cora@crunchcarbon.com` (already enforced via `coraGuard`)

Any failure → return blocker tag + reason, log via `logCoraDecision`, set `next_best_action` to one of: `research_email`, `research_website`, `confirm_location`, `set_segment`, `review_duplicate`, `review_existing_relationship`, `escalate`, `reject`.

Update `cora-discover` / research worker (whichever currently exists) so its objective is **lead completion**, not just discovery. After each pass it must:
1. Attempt to fill each missing field.
2. Recompute `completeness_score`.
3. Set `research_status` = Complete | Incomplete | Needs Review | Duplicate | Existing Agent | Existing Client | Not Fit.
4. Write evidence into `research_evidence` and a reason into `fit_reason`.

No changes to Outlook sender or `coraGuard`.

## 3. Frontend — collapse to 5 sections

Replace `PipelineView`'s 6 tabs with **exactly 5** views inside `src/components/admin/cora/PipelineView.tsx` (or a new `CrmView.tsx`):

1. **Lead Inbox** — `research_status in (New, Researching, Incomplete, Needs Review)`
2. **Complete Leads** — `completeness_score >= 80 AND outreach_status is null`
3. **Outreach Active** — `outreach_status in (First Email Sent, Follow-Up Due, Follow-Up Sent, No Response, Paused)`
4. **Conversations** — `outreach_status = Replied` (reuses existing Inbox component)
5. **Opportunities** — `sales_status is not null`

Sidebar in `SalesAgent.tsx` becomes: Command Centre · CRM · Conversations · Meetings · Decision Log · Controls. Remove the Board/Table/Action/Commercial/Relationships/Approval sub-tabs.

## 4. Unified Lead Card

New `LeadCard.tsx` used by every view. Shows exactly:
- Company name · Contact name · Contact email · Website · Location · Segment
- Status (research/outreach/sales as relevant) · Fit score badge · Completeness score ring (red <60, amber 60–79, green ≥80)
- Next best action line
- If incomplete: chips for each missing field (`No email`, `No website`, `Location?`, `Segment?`, `Possible duplicate`, `Existing agent`)

`LeadDetailDrawer` keeps deeper info: research notes/evidence, duplicate check, relationship check, suggested angle, email + reply history, meetings, decision log. Trim drawer to remove anything not in this spec.

## 5. Command Centre tiles

Update `CommandCentreView.tsx` counters to: Incomplete · Complete & ready · Outreach active · Awaiting reply · Opportunities · Blocked (existing agent/client/duplicate/DNC) · Needs human review. Each tile jumps to the matching CRM filter.

## 6. Cleanup

Remove now-unused stage constants and filter components in `PipelineView.tsx` (`STAGES`, `STAGE_LABEL`, `FilteredList`, `BoardView` kanban). Delete `ApprovalQueueTab` wiring from the new shell if approval is no longer a distinct view — surface "needs approval" inside Lead Inbox via the missing-fields chips instead. Per project rules, rewrite rather than patch the old multi-tab pipeline.

## Files touched

- `supabase/migrations/<new>.sql` — schema + trigger + backfill
- `supabase/functions/_shared/autoSendGate.ts` — completeness/segment gates
- `supabase/functions/cora-discover/index.ts` (or current research worker) — completion-focused loop
- `src/components/admin/cora/PipelineView.tsx` → rewritten as 5-section CRM
- `src/components/admin/cora/LeadCard.tsx` (new)
- `src/components/admin/cora/LeadDetailDrawer.tsx` — trim to spec
- `src/components/admin/cora/CommandCentreView.tsx` — new tiles
- `src/pages/admin/SalesAgent.tsx` — sidebar labels
- `src/hooks/cora/useCoraSignals.ts` — new counters

## Out of scope

- Outlook connector, mailbox health, `coraGuard`, decision log schema — unchanged.
- Meetings, Sequences, Learning tabs — removed from nav (functionality stays in DB).
