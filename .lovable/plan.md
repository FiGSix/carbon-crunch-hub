# Dashboard Cards Update

## Goal
Rename one card and add a sixth card showing the signed projects' revenue. Frontend-only change — the underlying `onboardingRevenue` value is already returned by the `get_dashboard_metrics_by_stage` DB function and exposed by `useDashboardMetricsByStage`.

## Changes

### File: `src/components/dashboard/sections/DashboardMetricsByStageCards.tsx`

1. Update the grid to fit 6 cards instead of 5:
   - Change `lg:grid-cols-5` → `lg:grid-cols-3 xl:grid-cols-6` (keeps a clean responsive layout: 1 col mobile, 2 cols sm, 3 cols lg, 6 cols xl).

2. Rename Card 3 title:
   - `"Onboarding Projects"` → `"Signed Project(s)"`
   - Keep the same icon (Clock) and `metrics.onboardingMwp` value.

3. Add new Card 4 immediately after Signed Project(s):
   - Title: `"Signed Project(s) Est. Revenue (2025-2030)"`
   - Value: `formatRevenue(metrics.onboardingRevenue)`
   - Icon: `DollarSign`
   - Color: `yellow` (matching Signed Projects card)

4. Final order will be:
   1. Proposal(s) Pending (red)
   2. Proposal(s) Pending Est. Revenue (red)
   3. Signed Project(s) (yellow) — renamed
   4. Signed Project(s) Est. Revenue (yellow) — new
   5. Vintage 2025 Audit Ready Projects (green)
   6. Vintage 2025 Est. Revenue (green)

## Out of scope
- No DB / edge function / RPC changes (data already present).
- No changes to role-based filtering — the existing RPC already scopes `onboarding_revenue` per user/role identically to the other metrics.

## Verification
- Visual check on dashboard for admin, agent, and client roles to confirm the new card renders the user's own signed-project revenue and the layout reflows correctly across breakpoints.