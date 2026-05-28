
# Cora Command Centre — Rebuild Plan

Replace the current 8-tab `/admin/sales-agent` page with a CRM-first command centre. Reuse all existing tables and edge functions; add new fields, a few new tables, and a fresh UI layer.

## 1. New page structure

Route: `/admin/sales-agent` (replaces `SalesAgent.tsx`). Six sections, not tabs-as-equals — a left sidebar with one default landing screen:

1. **Command Centre** (landing) — health + today's signals + recommended actions
2. **CRM Pipeline** — Board / Table / Action Required / Commercial Priority / Existing Relationship Review
3. **Lead Detail** — drawer + deep-link page (`/admin/sales-agent/lead/:id`)
4. **Conversations** — inbound replies with Cora drafts, escalation routing
5. **Meetings & Opportunities** — meetings tied to commercial outcomes
6. **Cora Controls** — autopilot, mailbox health, thresholds, knowledge, playbooks, blocklist, decision log, kill switch

Old `ApprovalQueueTab`, `DiscoveryTab`, `InboxTab`, `PipelineTab`, `MeetingsList`, `SequencesTab`, `LearningTab`, `SettingsTab`, `FunnelScoreboard` are deleted as standalone tabs. Their useful UI primitives (variant editor, blocklist manager, candidate notes panel, discovery presets card) are reused as building blocks inside the new sections.

## 2. Outlook-only sending (hard guarantee)

- All Cora send/reply/nudge code paths already route through `_shared/outlookSend.ts`. Add a runtime guard in `outlookSend.ts` that throws if `MICROSOFT_OUTLOOK_API_KEY` is missing, and a DB-stamped `sending_mailbox = 'cora@crunchcarbon.com'` on every outbound row.
- New edge function `cora-mailbox-health` (cron 5 min): calls `verify_credentials` on the Outlook connection, writes status into a new `cora_mailbox_status` row (latest only). Command Centre + Cora Controls read this.
- All cron-driven senders (`discovery-cron`, `sales-agent-nudge`, `send-cold-outreach`, `sales-agent-send`, draft-reply auto-send path) check `cora_mailbox_status.outcome = 'verified'` before sending. If not verified → write a decision-log entry `paused_mailbox_unavailable`, skip send, surface admin warning.
- Forbid any other mailer for Cora. Add a lint-style header comment + grep-based CI check (script in `_shared`) banning `resend`, `noreply`, `proposals@`, etc. inside `sales-agent-*` and `send-cold-outreach`. Platform mailers (proposals, invitations, roundup) stay on Resend — unchanged.

## 3. Duplicate / existing-relationship guard

New shared module `_shared/relationshipCheck.ts` used by `discover-leads`, `sales-agent-rescore`, `send-cold-outreach`, `sales-agent-send`, and `sales-agent-classify-reply`. It checks the candidate's email, domain, company name, website, and phone against:

- `agents`, `agent_invitations`, `agent_leads`
- `clients`, `client_team_members` (and any partner tables)
- `proposals`, `project_onboarding`
- `discovery_candidates` (prior), `lead_outreach_history`, `inbound_messages`, `outreach_replies`
- `discovery_blocklist`, unsubscribe events

Returns one of: `existing_agent | existing_invited_agent | existing_client | existing_prospect | duplicate_company | duplicate_contact | related_needs_review | do_not_contact | safe_new_lead`, plus `matched_record_id`, `matched_record_type`, and human reason.

Result is persisted on `discovery_candidates` (new columns) and re-checked at every send gate. Existing matches block cold outreach and instead create an admin "relationship action" note.

## 4. Data model additions

Single migration adds columns and tables. No destructive changes — old columns kept for back-compat.

`discovery_candidates` add:
- `lead_segment text`
- `fit_score int`, `personalisation_score int`, `research_confidence int`
- `cora_summary text`, `research_evidence jsonb`, `best_angle text`, `recommended_cta text`
- `last_meaningful_event_at timestamptz`, `next_best_action text`, `next_action_owner text`
- `escalation_required bool`, `escalation_reason text`
- `estimated_portfolio_size_mwp numeric`, `priority_score numeric`
- `do_not_contact_reason text`, `contact_permission_status text`, `contact_permission_reason text`
- `existing_relationship_status text`, `duplicate_check_status text`, `duplicate_match_type text`
- `matched_existing_record_id uuid`, `matched_existing_record_type text`
- `prompt_version text`, `last_cora_decision_at timestamptz`

`lead_outreach_history` + `outreach_replies` add: `sending_mailbox text`, `outlook_message_id text`, `outlook_thread_id text`.

`sales_agent_settings` add: `autopilot_status text` (`off|assisted|full`), confidence/fit/personalisation thresholds, daily caps for sends/approvals/enrollments/auto-replies, `prompt_version text`, `pause_all_sending bool`, `emergency_stop bool`.

New tables:
- `cora_mailbox_status` — single row latest health snapshot.
- `cora_decision_log` — `id, candidate_id, action, reason, data_used jsonb, confidence, prompt_version, variant_id, sending_mailbox, outlook_message_id, outlook_thread_id, duplicate_check_result jsonb, relationship_check_result jsonb, status_before, status_after, admin_override bool, created_at`. Indexed by candidate + created_at.
- `cora_recommended_actions` — daily-rebuilt list powering "Recommended admin actions for today" on Command Centre.

All new tables get `GRANT`s + RLS (`has_role(auth.uid(),'admin')`).

## 5. Pipeline stages

Extend candidate status enum (or move to `pipeline_stage text` with constraint) to support:
`new, researching, duplicate_check, existing_relationship_review, qualified, outreach_active, follow_up_active, engaged, meeting_requested, meeting_booked, proposal_opportunity, agent_invitation_sent, signed_up, first_proposal_sent, nurture, not_fit, existing_agent, existing_client, duplicate, do_not_contact`.

Backfill mapping from current statuses in the same migration.

## 6. Auto-send gate (one function, one source of truth)

New `_shared/autoSendGate.ts`. Returns `{allowed: bool, blocker?: string}` evaluating:
- mailbox verified
- relationship/duplicate = `safe_new_lead`
- valid email + SA company + solar-relevant
- `fit_score >= 3`, `personalisation_score >= 2`, `research_confidence >= 70`
- daily cap not reached (settings + today's `lead_outreach_history` count)
- autopilot_status, pause_all_sending, emergency_stop respect

Every Cora send path calls this and writes the result + blocker into `cora_decision_log`, then sets `next_best_action` on the candidate so admins see the missing item.

## 7. UI build order

1. New shell `src/pages/admin/CoraCommandCentre.tsx` with left nav; route swap.
2. Hooks `src/hooks/cora/*` for: mailbox health, today metrics, pipeline list, lead detail, conversations, decision log, recommended actions.
3. Components under `src/components/admin/cora/`:
   - `CommandCentre/` (HealthStrip, TodayMetrics, RecommendedActions, LatestActivity)
   - `Pipeline/` (BoardView, TableView, ActionRequiredView, CommercialView, RelationshipReviewView, LeadCard, StageColumn, NeedsApprovalBanner — replaces ApprovalQueue)
   - `LeadDetail/` (Overview, CoraResearch, RelationshipCheck, Conversation, Activity, Notes, Meetings, Commercial, NextBestAction, DecisionLog)
   - `Conversations/` (ReplyList, ReplyContextPanel, DraftEditor, EscalationBadge)
   - `Meetings/` (MeetingBoard, OutcomeForm, OpportunityLinks)
   - `Controls/` (AutopilotCard, MailboxCard, ThresholdsForm, KnowledgeEditor, PlaybooksEditor, BlocklistManager (reused), DecisionLogTable, EmergencyStopButton)
4. Reuse: `VariantEditorDialog`, `BlocklistManager`, `CandidateNotesPanel`, `DiscoveryPresetsCard`, `EditCandidateDialog`, `RejectReasonDialog`.

## 8. Edge function changes

- New: `cora-mailbox-health`, `cora-relationship-check` (HTTP wrapper around the shared module for ad-hoc admin recheck), `cora-recommend-actions` (cron, builds daily recommended actions).
- Modify: `discover-leads`, `sales-agent-rescore`, `sales-agent-classify-reply`, `sales-agent-draft-reply`, `sales-agent-send`, `sales-agent-nudge`, `send-cold-outreach`, `discovery-cron` to call relationship check + auto-send gate and write `cora_decision_log` + `sending_mailbox` fields.
- Unchanged: all platform Resend mailers, proposal/agent invitation flows.

## 9. Out of scope / kept as-is

- Resend-based platform emails (proposals, invitations, roundup, contact form) — untouched.
- MS Bookings link surface — reused as-is; only relocated into Meetings & Cora Controls.
- Agent/client/proposal tables — no schema changes, only read.

## 10. Migration & rollout

1. DB migration (columns + new tables + GRANTs + RLS + status backfill).
2. Shared modules (`relationshipCheck`, `autoSendGate`, mailbox guard).
3. Edge function updates + deploy.
4. New UI shell + Command Centre + Cora Controls.
5. Pipeline + Lead Detail.
6. Conversations + Meetings.
7. Delete legacy `SalesAgent.tsx` + obsolete tab components.

## Technical notes

- Status enum migration: prefer adding a new `pipeline_stage text` column with a CHECK constraint and a backfill, leaving the legacy `status` column populated for a release for safety.
- Decision log writes are append-only; never updated. Index `(candidate_id, created_at desc)`.
- All cron jobs that send must early-exit when `cora_mailbox_status.outcome != 'verified'` OR `sales_agent_settings.emergency_stop = true` OR `pause_all_sending = true`.
- `next_best_action` is the single field powering the "every blocker shows the missing item" UX rule — set by `autoSendGate` and by classifier when escalating.
