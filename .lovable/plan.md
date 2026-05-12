# Signed Project(s) Cards — Scope Fix

## Goal
Make the two yellow `Signed Project(s)` cards represent **signed but NOT yet audit-ready** projects, so the dashboard reads as a clean three-stage pipeline with no overlap:

```text
Pending  →  Signed (in progress)  →  Audit Ready
  red             yellow                  green
```

## Current behaviour (problem)
The DB function `get_dashboard_metrics_by_stage` defines the "onboarding" bucket as:
- `signed_at IS NOT NULL` AND `(onboarding_complete = false OR IS NULL)`

This is "in-onboarding" — close, but not the same as "signed but not audit-ready". A project can be `audit_ready = true` while `onboarding_complete = false`, in which case it would appear in BOTH the yellow and green cards.

## Change

### Database — single migration to update `get_dashboard_metrics_by_stage`

In the `onboarding_projects` CTE, replace the completion filter with an audit-ready filter:

```sql
-- Before
AND (po.onboarding_complete = false OR po.onboarding_complete IS NULL)

-- After
AND (po.audit_ready = false OR po.audit_ready IS NULL)
```

Everything else (role-based filtering, revenue formula using `v_carbon_price_6yr = 891.71` for 2025–2030, MWp aggregation) stays exactly the same — math is already correct and consistent across the three card pairs.

Result:
- `Signed Project(s)` MWp = sum of system_size_kwp for signed, non-archived projects whose `audit_ready` is not true
- `Signed Project(s) Est. Revenue (2025-2030)` = same role-aware 6-year revenue formula, applied to the same set
- No overlap with the green Audit Ready cards
- Sum of yellow + green MWp = total signed-project MWp

### Frontend
No changes needed — `useDashboardMetricsByStage` already exposes `onboardingMwp` / `onboardingRevenue`, and the cards are already wired to them with the new labels and yellow colour.

## Out of scope
- No changes to the green Audit Ready cards or the red Pending cards.
- No changes to role filtering, pricing constant, or the surrounding query keys / cache.
- No code rename of internal field names (`onboardingMwp`, `onboarding_revenue`, etc.) — keeping the migration minimal. Can be cleaned up in a later refactor pass if desired.

## Verification
1. Run the function for an admin and confirm: yellow MWp + green MWp ≈ total signed MWp, with no double counting.
2. Spot-check a project that is signed and audit-ready — should appear only in green.
3. Spot-check a project that is signed but not yet audit-ready — should appear only in yellow.
4. Visual check on the dashboard for admin / agent / client roles.