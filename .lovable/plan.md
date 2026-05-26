# Phase 2 — Candidate Approval Queue + Autopilot

Phase 1 inserts discovered EPCs straight into `agent_leads`. Phase 2 inserts them into `discovery_candidates` first, then either:

- **Auto-promotes** candidates whose `score >= sales_agent_settings.score_threshold` (Autopilot ON), or
- **Stages** them in an **Approval Queue** where an admin cherry-picks who goes into the pipeline.

Approved candidates flow into `agent_leads` exactly as today, optionally auto-enrolled in the default outreach sequence. Rejected candidates are blocklisted so future discovery runs skip them.

---

## Flow

```text
discover-leads ──► discovery_candidates (status='pending', score)
        │              │
        │   ┌──────────┴───────────┐
        │   score >= threshold      score <  threshold
        │   AND autopilot ON        OR autopilot OFF
        │          │                         │
        │          ▼                         ▼
        │   auto-promote               Approval Queue UI
        │   → agent_leads              admin: Approve / Edit / Reject / Bulk
        │   (status='auto_promoted')             │
        │          │                ┌────────────┼─────────────┐
        │          │              Approve      Reject        Edit+Approve
        │          │                │            │             │
        │          └────────────────┼────► agent_leads          │
        │                           ▼                          ▼
        │                  discovery_blocklist            (apply edits, then approve)
        │                  (domain + name)
        ▼
   dedup check also consults discovery_blocklist
```

---

## What changes

### 1. Edge function: rework `discover-leads`
Today it inserts into `agent_leads` directly. Change it to:
- Insert every find into `discovery_candidates` with `run_id`, `score`, `enrichment` JSON.
- Dedup against existing `agent_leads` (company_name + domain) **AND** `discovery_blocklist` (domain or normalized company name). Blocklisted hits get `status='blocked'` and are never shown in the queue.
- After insert, read `sales_agent_settings`. If `autopilot_discovery` is true, call `promote_discovery_candidate()` for every candidate with `score >= score_threshold AND status='pending'`.
- Return `{ candidates_created, auto_promoted, pending_review, duplicates, blocked }`.

### 2. New RPC: `promote_discovery_candidate(_candidate_id uuid)`
Single source of truth, called by autopilot and the manual "Approve" button. SECURITY DEFINER, admin-only.
- Inserts row into `agent_leads` (copies company/email/website/contact/location/phone, sets `source='ai-discovery:{run_id}'`).
- Updates candidate: `status='approved'` (or `'auto_promoted'`), `reviewed_at`, `reviewed_by`, `created_lead_id`.
- If `autopilot_outreach` is on AND lead has email AND domain not blocked → insert `outreach_enrollments` row using `default_sequence_id`, `next_send_at=now()+random jitter`.
- Returns the new `agent_leads.id`.

### 3. New RPC: `reject_discovery_candidate(_candidate_id uuid, _reason text)`
SECURITY DEFINER, admin-only.
- Updates candidate: `status='rejected'`, `reviewed_at`, `reviewed_by`.
- **Inserts into `discovery_blocklist`** (see schema below) using the candidate's domain (extracted from email or website) and normalized company name, with `reason` and `created_by`.
- Idempotent — `ON CONFLICT DO NOTHING` on blocklist.

Admins can later unblock a company from a dedicated "Blocklist" view in Settings.

### 4. New edge function: `sales-agent-bulk-action`
Admin-invoked. Body: `{ candidate_ids: uuid[], action: 'approve'|'reject', reason?: string }`. Loops over IDs calling the matching RPC. Returns per-id results + counts.

### 5. Frontend: new **Approval Queue** tab
New tab in `/admin/sales-agent` between Discovery and Pipeline.

Components:
- `ApprovalQueueTab.tsx` — table of `discovery_candidates` where `status='pending'`, columns: checkbox, company, location, email, score (color-coded vs threshold), run, created_at, actions.
- Filters: by run, by score range, "Below threshold only" toggle, search by company.
- Row actions: **Approve**, **Reject** (prompts for reason), **Edit before approve** (opens dialog).
- Bulk toolbar:
  - **Approve selected**
  - **Reject selected** (single reason applied to all)
  - **Approve all above threshold** — the backfill button (see §7 below)
- Counter chips: total pending, above threshold, below threshold.

Components:
- `CandidateRow.tsx`
- `BulkActionBar.tsx`
- `EditCandidateDialog.tsx` (see §8)
- `BlocklistManager.tsx` — small table in Settings tab to view/remove blocklist entries.

### 6. Frontend: update **Discovery** tab
- Remove direct insert into `agent_leads`.
- Show per-run breakdown: `created · auto_promoted · pending · duplicates · blocked`.
- "Review N pending" link → jumps to Approval Queue filtered by that run.

### 7. Frontend: update **Settings** tab — threshold + backfill
Threshold changes **only apply to future runs** — we never silently auto-promote existing pending candidates when an admin moves the slider (avoids surprise mass-promotions).

For the backfill case, the Approval Queue's **"Approve all above threshold"** bulk button handles it: it selects every `pending` candidate where `score >= current threshold` and runs bulk approve. Visible confirmation dialog with count.

Also add to Settings:
- Tooltip on `score_threshold`: "Applies to new discoveries. Use 'Approve all above threshold' in the Approval Queue to backfill existing pending candidates."
- A "Test promote" preview button: shows `N candidates would qualify at threshold X` without doing anything.
- **Blocklist Manager** section: table of `discovery_blocklist` with company, domain, reason, blocked_at, action: Remove. Removing also clears any related `discovery_candidates` with `status='blocked'`.

### 8. Edit before approve — field rules

| Field           | Editable | Reason |
|-----------------|----------|--------|
| company_name    | No       | Identity key, used for dedup; renaming hides duplicates. |
| website         | No       | Identity key, used for domain dedup + blocklist. |
| score           | No       | Computed by AI — manual edits would corrupt threshold logic. |
| enrichment JSON | No       | Audit trail of what AI saw at discovery time. |
| **email**       | Yes      | Most common gap — admins routinely fix typos / pick a better address. |
| **contact_name**| Yes      | Often missing or wrong from extraction. |
| **phone**       | Yes      | Same — frequently incomplete. |
| **location**    | Yes      | AI sometimes returns city only; admin may correct to region/country. |
| **notes**       | Yes      | Free-text admin context that carries over to the lead. |

Dialog shows read-only fields greyed at the top, editable fields below. On save → updates the candidate row, then immediately calls `promote_discovery_candidate`. (No "save edits without approving" path — keeps the queue actionable.)

### 9. Pipeline tab badge
Small badge on the Pipeline tab header: `N awaiting approval` linking to the queue, so admins don't forget.

---

## Database

Most schema is already there from Phase 1. New objects:

```sql
-- New blocklist table
create table public.discovery_blocklist (
  id uuid primary key default gen_random_uuid(),
  company_name_normalized text,        -- lower(trim(company_name))
  domain text,                          -- extracted from email/website, lower
  reason text,
  created_by uuid,
  created_at timestamptz not null default now(),
  unique nulls not distinct (company_name_normalized, domain)
);
alter table public.discovery_blocklist enable row level security;
create policy "Admins manage discovery_blocklist" on public.discovery_blocklist
  for all to authenticated
  using (has_role(auth.uid(), 'admin')) with check (has_role(auth.uid(), 'admin'));
create index on public.discovery_blocklist (domain);
create index on public.discovery_blocklist (company_name_normalized);

-- RPCs (admin only)
create or replace function public.promote_discovery_candidate(_candidate_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$ … $$;

create or replace function public.reject_discovery_candidate(_candidate_id uuid, _reason text)
returns void language plpgsql security definer set search_path = public as $$ … $$;

-- New candidate status: add 'blocked' alongside pending/approved/auto_promoted/rejected/duplicate

-- Queue index
create index if not exists idx_discovery_candidates_pending
  on public.discovery_candidates (status, score desc, created_at desc);
```

Candidate statuses: `pending`, `approved`, `auto_promoted`, `rejected`, `duplicate`, `blocked`.

---

## Files touched / created

**Edge functions**
- `supabase/functions/discover-leads/index.ts` — rewrite target table + blocklist check + autopilot loop
- `supabase/functions/sales-agent-bulk-action/index.ts` — new

**Migration**
- `discovery_blocklist` table + RLS + indexes
- `promote_discovery_candidate` RPC
- `reject_discovery_candidate` RPC
- `idx_discovery_candidates_pending`

**Frontend**
- `src/pages/admin/SalesAgent.tsx` — add Approval Queue tab + pending badge
- `src/components/admin/sales-agent/ApprovalQueueTab.tsx` — new
- `src/components/admin/sales-agent/CandidateRow.tsx` — new
- `src/components/admin/sales-agent/BulkActionBar.tsx` — new (includes "Approve all above threshold")
- `src/components/admin/sales-agent/EditCandidateDialog.tsx` — new (editable: email, contact_name, phone, location, notes)
- `src/components/admin/sales-agent/RejectReasonDialog.tsx` — new
- `src/components/admin/sales-agent/BlocklistManager.tsx` — new (Settings tab)
- `src/components/admin/sales-agent/DiscoveryTab.tsx` — update run summary + link
- `src/components/admin/sales-agent/SettingsTab.tsx` — threshold copy + Test promote + Blocklist section

---

## Out of scope (defer to Phase 3)
- Inbound reply parsing / AI auto-reply
- Meeting booking
- Re-scoring candidates after enrichment changes
- Slack/email notifications when N candidates are pending
- Per-candidate notes/comments thread

---

## Resolved decisions
1. **Reject = blocklist.** Rejecting a candidate writes to `discovery_blocklist` (domain + normalized company name). Future discovery runs skip blocklisted entries silently. Admins can unblock from Settings.
2. **Threshold changes are forward-only.** Lowering the threshold never auto-promotes existing pending candidates. Backfill is an explicit "Approve all above threshold" bulk action in the queue.
3. **Edit before approve.** Identity + scoring fields (company_name, website, score, enrichment) are read-only. Contact fields (email, contact_name, phone, location, notes) are editable. Saving edits in the dialog also approves the candidate in the same step.
