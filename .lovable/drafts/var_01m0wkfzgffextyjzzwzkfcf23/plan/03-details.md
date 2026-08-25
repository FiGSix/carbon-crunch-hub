## Admin component verdicts

| Component | Real workflow? | Data source | Verdict |
| --- | --- | --- | --- |
| Proposals worth a personal nudge | Yes for partners (engagement + age + MWp are real fields), but not an admin task — admins do not phone clients | `useAgentWarmCards` over `proposals` engagement fields | MERGE into partner "Needs your attention"; on admin home only as an "MWp stalled at proposal" exception row |
| Portfolio review | No defined Crunch Carbon process; it is a gated re-send bucket | `usePortfolioReviewClusters` | REMOVE from all dashboard homes; the signal (multiple unsigned proposals) becomes one attention rule |
| Close-out queue | Yes — `archive_proposal` exists — but it is pipeline hygiene, not executive | `useCloseoutQueue` | MOVE to `/proposals` as an archive filter/row action |
| Learning dashboard | Analytics, not a decision screen | `useLearningMetrics` | MOVE to a dedicated admin analytics page, linked from the trend section |

## Metric → source mapping (production values only)

- Total / Audit Ready / Signed / Proposal MWp and revenue → `get_dashboard_metrics_by_stage` (already role-scoped, excludes archived).
- Audit Ready = `proposals.audit_ready` true (synced from `project_onboarding`).
- Audit review requests → same RPC; Agent approvals → `usePendingAgentApprovals`.
- Partner counts / active partners → `get_agents_management_counts`; "active" = has ≥1 non-archived proposal in the last 90 days. Definition surfaced in a tooltip so it is auditable.
- Super Partner network → `get_super_partner_dashboard_stats` + `get_super_partner_companies`, extended with stage MWp.
- MWp added this period → computed from `proposals.signed_at` / onboarding completion timestamps. If a period has no rows, the card reads "No change this period" — no fabricated delta.
- Anything not derivable (e.g. conversion rate without a reliable sent timestamp) is omitted rather than estimated.

## Motion map (to be implemented, not just described)

| Interaction | Motion | Where |
| --- | --- | --- |
| Dashboard entry | staggered reveal, hero → attention → funnel, ~40ms steps | each role home |
| KPI changed | `AnimatedNumber` count to new value only when the value differs from the last seen value | hero + funnel |
| Progress changed | `AnimatedProgress` tween between percentages | client project progress, onboarding rows |
| Agreement signed | stage badge cross-fade + funnel connector advance + short inline confirmation | funnel, project row |
| Audit Ready | progress completes into Audit Ready, badge gains branded emphasis, MWp total re-counts, one concise message, then settles | funnel + hero |
| Card hover | 1px border/contrast lift + CTA fade-in, no resize | attention rows, funnel segments |
| Drawer | smooth slide via `DetailDrawer` | all drill-downs |
| Filter | list cross-fades between filtered sets | network health, attention filters |

All of it respects `useReducedMotion`; nothing loops after settling.

## Implementation scope

Presentation-layer only: rebuild the four role homes from the components listed as KEEP/MERGE, delete `PlaceholderCard`, move `LearningDashboardSection` to an admin analytics route, move close-out into `/proposals`. Proposal creation/sending, agreements, onboarding, RLS, roles and existing RPC business logic are untouched; new SQL is limited to additive read-only functions for partner activation and period deltas, staged as a migration.
