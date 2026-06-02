
# Remove Sales Agent (Cora) — full teardown

The `/admin/sales-agent` "Cora Command Centre" experiment is being retired. Everything tied to it — UI, hooks, edge functions, shared modules, scheduled jobs, and database tables — will be deleted. The unrelated Leads/Agents admin tab outreach (which currently piggybacks on the same Cora plumbing) will also be removed per your decision.

## 1. Frontend removals

Delete:
- `src/pages/admin/SalesAgent.tsx`
- `src/components/admin/cora/` (entire folder: CommandCentreView, ConversationsView, CoraControlsView, DecisionLogView, LeadCard, LeadDetailDrawer, MeetingsView, PipelineView)
- `src/components/admin/sales-agent/` (entire folder: ApprovalQueueTab, BlocklistManager, CandidateNotesPanel, DiscoveryPresetsCard, DiscoveryTab, EditCandidateDialog, FunnelScoreboard, InboxTab, LearningTab, MeetingsList, PipelineTab, RejectReasonDialog, SequencesTab, SettingsTab, VariantEditorDialog)
- `src/hooks/cora/` (useCoraSignals)
- `src/components/admin/agents/SendOutreachDialog.tsx`
- `src/components/admin/agents/OutreachHistoryDialog.tsx`

Edit:
- `src/App.tsx` — remove the `SalesAgent` lazy import and the `/admin/sales-agent` route.
- `src/components/layout/DashboardSidebar.tsx` — remove the "Sales Agent" / Cora nav entry pointing to `/admin/sales-agent`.
- `src/components/admin/agents/LeadsAgentsTable.tsx` — remove the Send Outreach / Outreach History buttons and their imports/handlers. Other lead actions (add, edit, convert, details, bulk import) remain.
- `src/components/admin/agents/LeadDetailsDialog.tsx` — remove the outreach-history panel; keep the rest of the dialog.

## 2. Edge function removals

Delete these function folders (and call `delete_edge_functions` to remove the deployed copies):

- cora-enrich
- cora-mailbox-health
- cora-preset-expand
- cora-relationship-check
- discover-leads
- discovery-cron
- poll-inbound
- sales-agent-bulk-action
- sales-agent-classify-reply
- sales-agent-draft-reply
- sales-agent-notify
- sales-agent-nudge
- sales-agent-rescore
- sales-agent-send
- sales-agent-tune
- send-cold-outreach

Delete shared modules (no remaining callers after the above are gone):
- `supabase/functions/_shared/coraGuard.ts`
- `supabase/functions/_shared/coraSignature.ts`
- `supabase/functions/_shared/outlookSend.ts`
- `supabase/functions/_shared/autoSendGate.ts`
- `supabase/functions/_shared/relationshipCheck.ts`
- `supabase/functions/_shared/lead-ingest.ts`

Remove the matching `[functions.*]` entries from `supabase/config.toml` (if present).

## 3. Cron jobs

Unschedule via a `cron.unschedule(...)` insert (not a migration, since it contains the project ref/anon key):

- `poll-inbound-every-5-min`
- `sales-agent-notify-every-15-min`
- `discovery-daily`
- `outreach-send-15min`
- `nudge-daily`
- `cora-enrich-every-5-min`
- `discovery-midday`
- `cora-preset-expand-daily`

## 4. Database — migration

Drop sales-agent-only objects (views first, then tables, then functions). All have FKs internal to this set, so a single migration with `CASCADE` is safe.

Views:
- `v_outreach_variant_stats`
- `v_sales_agent_funnel`

Tables:
- `cora_decision_log`
- `cora_mailbox_status`
- `cora_recommended_actions`
- `discovery_blocklist`
- `discovery_candidates`
- `discovery_runs`
- `outreach_enrollments`
- `outreach_replies`
- `outreach_sequences`
- `outreach_template_variants`
- `sales_agent_discovery_presets`
- `sales_agent_runs`
- `sales_agent_settings`
- `score_history`
- `lead_outreach_history`

Functions:
- `compute_candidate_score`
- `discovery_candidates_rescore_fn`
- `promote_discovery_candidate`
- `reject_discovery_candidate`
- `rescore_pending_candidates`

Kept (not sales-agent-specific):
- `agent_leads` and `recalc_lead_completeness` / `trg_agent_leads_draft_proposal` — used by the Leads/Agents admin tab for manual lead capture and proposal drafting.
- `is_team_lead`, `notify_team_lead_on_invite` — unrelated invite/team logic.
- `client_email_suppressions` and all other unrelated tables.

After the migration runs, the auto-regenerated `src/integrations/supabase/types.ts` will lose the dropped tables/functions — no manual edit needed.

## 5. Verification

After applying:
- Build the app and confirm no TypeScript errors (sidebar, App.tsx, LeadsAgentsTable, LeadDetailsDialog).
- Smoke-test the unrelated admin areas: Dashboard (Portfolio Review + Warm Cards still render with their admin "Agent: <company>" line), Leads/Agents tab (add/edit/convert/details/bulk import still work), Proposals, Onboarding, System Settings.
- Check `supabase--linter` for any orphaned references.
- Re-grep the codebase for `cora`, `sales-agent`, `discovery_candidate`, `outreach_`, `sales_agent_`, `lead_outreach_history`, `useCoraSignals`, `SendOutreachDialog`, `OutreachHistoryDialog` — should return zero hits outside `supabase/migrations/` history.

## Notes / risks

- `send-cold-outreach` is the only place agents currently send manual outreach to leads from the Leads tab. Per your answer, the Send Outreach button and history view are being removed entirely — agents will no longer be able to email leads from the admin Leads table until a replacement is built.
- Historical `lead_outreach_history` records will be dropped along with the table. If you'd like to archive the data before deletion, say so and I'll add a CSV export step before the migration.
- Existing `supabase/migrations/*.sql` files that originally created these objects are left untouched (migrations are append-only); a single new drop migration handles the teardown.
