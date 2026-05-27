# Sales Agent page — review and cleanup

I audited `src/pages/admin/SalesAgent.tsx` and all 9 sub-components. The page is broadly functional — no fully dead tabs — but there are 1 stale label, 3 reliability bugs, 1 misplaced section, 1 missing action, and a few "nice to have" gaps. Below is what I found and what I propose to change.

## Findings (per tab)

| Tab / component | Status | Issue | Action |
|---|---|---|---|
| Header badge `"Phase 3 · Conversations + Meetings"` | Stale | Build-phase label, never removed | Remove |
| FunnelScoreboard | ✅ Working | — | Keep |
| PipelineTab | ⚠️ Bug | "Mark replied" sets `agent_leads.status='qualified'` but the funnel view doesn't derive stage from `status` alone, so the row often doesn't visibly advance. Leads with no email show no CTA. | Fix mutation to advance funnel; add empty-state helper text for no-email leads |
| DiscoveryTab | ⚠️ Minor | Limit slider capped at 25, edge function `discover-leads` accepts 100. Default query hard-coded. | Raise cap to 100 |
| DiscoveryPresetsCard | ⚠️ Misplaced | Lives inside SettingsTab; it's a discovery workflow, not a setting. Admin has to leave Discovery to manage automated runs. | Move into DiscoveryTab |
| ApprovalQueueTab | ✅ Working | Shares fragile `sales_agent_settings.eq("id", true)` pattern with 2 other tabs (see below) | Fix shared bug |
| InboxTab | ⚠️ Bug | Draft sync uses a bare `if` in render body instead of `useEffect` — fragile React anti-pattern | Wrap in `useEffect` |
| MeetingsList | ✅ Working but read-only | No way to mark a meeting held/cancelled | Add status actions (optional, P3) |
| SequencesTab | ⚠️ Gap | No "Create sequence" button anywhere in the UI — sequences can only be added via direct DB insert. Variant status controls duplicated with LearningTab (acceptable). | Add Create-Sequence dialog |
| LearningTab | ✅ Working | — | Keep |
| SettingsTab | ⚠️ Bug | Reads settings with `.eq("id", true)` — same pattern in PipelineTab + ApprovalQueueTab. If the PK isn't literally `true`, returns null and silently falls back to defaults. | Fix all 3 call sites to use the real settings-singleton lookup |

**Cross-tab redundancies**

- Variant status controls exist in both Sequences and Learning — same mutation key, so it's coordinated; **keep as-is** (different mental models for each tab).
- The Pipeline tab's `N to review` badge jumps to the Approval tab on click — intentional, slightly confusing but useful; **keep**.
- `sales_agent_settings` is fetched in 3 tabs independently — React Query dedupes; only the `eq("id", true)` lookup needs fixing.

**Edge functions** — all are wired except `sales-agent-send`, which appears to be called internally from `sales-agent-draft-reply`'s auto-send path. Will confirm during the fix, no UI changes needed.

## Proposed changes (this pass)

Scoped, no new features beyond closing the gaps above.

1. **`src/pages/admin/SalesAgent.tsx`** — remove the stale `"Phase 3 · Conversations + Meetings"` badge.
2. **Settings singleton lookup** — inspect the `sales_agent_settings` table to confirm the actual PK/singleton row, then fix the lookup in `SettingsTab.tsx`, `PipelineTab.tsx`, and `ApprovalQueueTab.tsx` (likely `.maybeSingle()` with no filter, or `.eq('id', <known-uuid/int>)`).
3. **`InboxTab.tsx`** — replace the bare `if (draft && draft.id && draftBody === "")` block with a `useEffect` keyed on `draft?.id` so draft body initialization is deterministic.
4. **`PipelineTab.tsx` → `markReplied`** — update the mutation so the funnel view actually advances the lead (set the column the view derives stage from, not just `status`); add a small "No email on file" hint where the Enroll CTA is hidden.
5. **`DiscoveryTab.tsx`** — raise the `limit` cap from 25 → 100 to match the edge function.
6. **Move `DiscoveryPresetsCard`** out of `SettingsTab.tsx` and render it inside `DiscoveryTab.tsx` (under the manual-run form). Imports adjusted accordingly.
7. **`SequencesTab.tsx`** — add a "New sequence" button + small dialog (name, channel, description) that inserts into `outreach_sequences`. Refresh list on success.
8. **Confirm `sales-agent-send`** is invoked from `sales-agent-draft-reply` (read-only check, no edit if confirmed).

## Out of scope (flagged but not touched this pass)

- Generating typed Supabase definitions for `sales_agent_*` / `discovery_*` / `outreach_*` tables (would remove all the `(supabase as any)` casts) — separate, larger refactor.
- Adding meeting status actions (mark held/cancelled) in `MeetingsList`.
- Adding a "Test notification" button to SettingsTab.

Let me know if you'd like the optional items pulled into this pass, or if I should ship just the bugfixes + misplacement first.
