
# Make Cora actually pursue 250 onboarded agents

Today Cora discovers leads once a day, never enriches them, and never adapts when discovery dries up. The new completeness gate will block almost all sending. This plan closes the three gaps you confirmed.

## 1. Continuous enrichment worker

New edge function `cora-enrich`:
- Pick up to N leads where `research_status in ('New','Researching','Incomplete')` and `completeness_score < 80`, ordered by oldest update first.
- For each lead, fill missing fields using Firecrawl (`map` + `scrape` on the company website) and Lovable AI (extract contact name/email, segment, SA location, fit reason) — only fields listed in `completeness_missing`.
- Write back, recompute completeness via the trigger, set `research_status` to `Complete | Incomplete | Needs Review | Not Fit | Existing Agent/Client | Duplicate`, log to `cora_decision_log`.
- If the batch returns 0 candidates → mark run as `idle` and exit (worker idles).
- If candidates were processed → re-invoke itself (`supabase.functions.invoke('cora-enrich')`) to keep draining the inbox.

Trigger: cron every 5 minutes calls `cora-enrich`. If already running (lock row in `sales_agent_runs` with `job_name='enrich'` + `status='running'`), it no-ops. This gives the "continuous worker that loops until inbox empty, then idles" behaviour without long-running connections.

Guardrails: respects `sales_agent_settings.autopilot_status`, `pause_all_sending` (research keeps running, sending stays paused), `emergency_stop`, and a new `enrichment_daily_cap` (default 500 leads/day) to cap Firecrawl + LLM spend.

## 2. Goal-driven discovery top-up

Extend `sales_agent_settings`:
- `target_agents int default 250`
- `goal_topup_enabled bool default true`
- `max_topup_runs_per_day int default 4`

Update `discovery-cron`:
1. Run existing daily preset sweep as today.
2. After sweep, compute:
   - `onboarded = count(discovery_candidates where sales_status='Signed Up')`
   - `in_pipeline = count where research_status in ('Complete') OR outreach_status is not null and not in terminal states`
   - `gap = target_agents - onboarded - (in_pipeline * expected_conversion)` (expected_conversion stored on settings, default 0.1)
3. If `gap > 0` and `goal_topup_enabled` and today's topup runs < cap → invoke `discover-leads` again for the highest-yield active presets, log a `topup` run.

A second cron entry runs `discovery-cron` mid-day (e.g. 12:00 UTC) so top-ups happen the same day, not 24h later.

## 3. Auto-expanding presets

New edge function `cora-preset-expand` (cron daily at 03:00 UTC, before discovery sweep):
- For each active preset, look at candidates created in the last 14 days. If `new_candidates < 3` → mark preset `stale=true`.
- For every stale preset, call Lovable AI (`google/gemini-3-flash-preview`, tool-calling for structured output) with: goal segment (residential/commercial/agri solar installers in SA), existing preset queries, list of already-onboarded company names and regions. Ask it to propose 3 new `{query, location, limit_count}` variations that haven't been tried — different SA regions, adjacent segments, different search angles.
- Insert new presets as `active=true, source='auto_expand'`, log to `cora_decision_log`.
- Hard cap: never more than 20 active presets; oldest auto-expand presets get retired first.

## 4. Schema additions (one migration)

```sql
alter table sales_agent_settings
  add column target_agents int default 250,
  add column goal_topup_enabled bool default true,
  add column max_topup_runs_per_day int default 4,
  add column expected_conversion numeric default 0.1,
  add column enrichment_daily_cap int default 500;

alter table sales_agent_discovery_presets
  add column stale bool default false,
  add column source text default 'manual',  -- manual | auto_expand
  add column last_yield_count int default 0;
```

Plus the cron schedule rows (inserted via the insert tool, not migration, since they contain the project URL + anon key).

## 5. Frontend (small)

Add a "Cora goal" card to `CommandCentreView`:
- Onboarded / target (250)
- Pipeline projected to hit goal: yes/no
- Enrichment worker status: running / idle / paused
- Last top-up run + last preset expansion

Add a toggle in `CoraControlsView` → Autopilot panel for `goal_topup_enabled` and a number input for `target_agents`, `enrichment_daily_cap`.

## 6. Files

- `supabase/migrations/<new>.sql`
- `supabase/functions/cora-enrich/index.ts` (new)
- `supabase/functions/cora-preset-expand/index.ts` (new)
- `supabase/functions/discovery-cron/index.ts` (add top-up logic)
- `src/components/admin/cora/CommandCentreView.tsx` (goal card)
- `src/components/admin/cora/CoraControlsView.tsx` (new settings)
- `src/hooks/cora/useCoraSignals.ts` (goal + worker status)
- Cron schedule SQL inserted via insert tool

## Out of scope
- Outlook connector, `autoSendGate`, completeness rubric — unchanged.
- No changes to the CRM 5-section layout.
