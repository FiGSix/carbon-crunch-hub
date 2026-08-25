# Dashboard Rationalisation — Review First

## What is actually on screen today

`/dashboard` renders one page for client, partner and admin, in this order:

1. Header + Refresh Data button
2. `SinceLastVisit` strip
3. `MilestoneCard` (MWp milestones)
4. `ClientStatusPanel` (client only)
5. `NextBestAction` (agent/admin)
6. `AgentWarmCards` — "Proposals worth a personal nudge" (5 rows, full width)
7. `PortfolioReviewSection` + `CloseoutQueueSection` (side by side)
8. `LearningDashboardSection` (admin only, 8 KPI tiles)
9. `DashboardTopRow` — Vintage Progress, Audit Review Requests, Agent Approval, Vintage Revenue Breakdown, Vintage Blend Pipeline, Vintage Countdown
10. `DashboardMetricsByStageCards` — 6 equal cards (3 MWp + 3 revenue)

`/super-partner` is the opposite problem: 5 flat stat cards, no funnel, no network health, no actions.

## Verdict per role

### Client
Strengths: `ClientStatusPanel` is calm and correct. Problems: it is then followed by the full agent-oriented vintage grid and 6 stage cards that repeat the same portfolio in MWp and Rand.
- KEEP: ClientStatusPanel, Vintage Progress.
- MERGE: 6 stage cards → one project progress + value block.
- REMOVE from client home: Vintage Blend Pipeline, Vintage Countdown, Solar Starter badge card, Milestone card.

### Partner
Strengths: real MWp/revenue by stage; warm cards are genuinely actionable. Problems: **four** components compete to say "act on these proposals" (NextBestAction, Warm cards, Portfolio review, Close-out queue), then 6 stage cards restate the funnel, then the vintage grid adds 4 more cards. Nothing dominates.
- KEEP: warm-card logic (real engagement data), stage MWp figures.
- MERGE: NextBestAction + Warm cards + Portfolio review + Close-out queue → one **Needs your attention** list, ranked by MWp at risk, close-out as a row action.
- MERGE: 6 stage cards → one **Your pipeline** funnel (count + MWp per stage, revenue on hover/drill-down).
- MOVE: Vintage Blend Pipeline, Vintage Countdown, Vintage Revenue Breakdown → a Vintage/Revenue drill-down.
- REPLACE: hero — currently there is none; add Portfolio MWp hero with 3 secondary figures.

### Super Partner
Problems: no funnel, no network health, no interventions, no drill-down; "Current Rate" and commission dominate a screen that should be about network growth.
- ENHANCE: keep the 5 real values, demote rate/commission to a secondary row.
- ADD (justified, not additive clutter): one interactive **Partner network** health bar (active / growing / needs attention / not activated) filtering the existing partner list, one **Network opportunity** funnel, one interventions list.

### Admin
Problems: the busiest screen, and the four challenged components (nudge, portfolio review, close-out, learning) are agent-workflow or analytics surfaces, not executive signals. Duplicated: Audit Review Requests appears both as its own card and inside the funnel.
- REMOVE from admin home: Learning dashboard (→ its own analytics page), Portfolio review, Close-out queue.
- MERGE: nudge + overdue onboarding + stalled partners → **Attention required**.
- KEEP/ENHANCE: Platform growth hero, funnel, Agent Approval + Audit Review as attention rows, one trend.

## Data integrity check (already done)
No `Math.random`, no hardcoded demo values, no fabricated conversion rates were found in the dashboard hooks — every current figure resolves to an RPC over `proposals` / `project_onboarding`. `PlaceholderCard` ("Coming Soon") is imported but unused; it will be deleted. Any metric I cannot source (e.g. period-over-period MWp added, partner activation) will either be computed in SQL or shown as "No data yet" — never invented.
