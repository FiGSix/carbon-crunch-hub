
# Status Migration Fix - COMPLETED

## Summary

All issues from the status migration have been fixed:

| Issue | Status | Result |
|-------|--------|--------|
| Issue 1: Frontend hook data access | ✅ Fixed | Now correctly handles TABLE return |
| Issue 2: Revenue calculation | ✅ Fixed | Using R891.71 tiered sum |
| Issue 3: Onboarding MWp logic | ✅ Fixed | Using `onboarding_complete = false` |
| Issue 4: Role-based revenue | ✅ Fixed | Admin/Agent/Client see correct shares |
| Issue 5: Edge functions 'pending' | ✅ Fixed | Now use 'draft' |
| Issue 7: ProposalInviteButton 'pending' | ✅ Fixed | References removed |

## Verified Results

```
Onboarding MWp: 67.69 (was 56.44 - FIXED)
Audit Ready Revenue: R 5,297,736 (using R891.71 - FIXED)
Audit Review Requests: 4
Pending Approval MWp: 145.07
```

## Files Modified

- `src/hooks/dashboard/useDashboardMetricsByStage.ts` - Fixed data access, added onboardingRevenue
- `src/hooks/dashboard/types.ts` - Added onboardingRevenue field
- `supabase/functions/create-legacy-project/index.ts` - Changed 'pending' to 'draft'
- `supabase/functions/generate-proposal-pdf/index.ts` - Updated status checks
- `src/components/proposals/components/ProposalInviteButton.tsx` - Removed 'pending' refs

## Database Migration Applied

Restored `get_dashboard_metrics_by_stage` with:
- TABLE return type (compatible with frontend)
- R891.71 tiered 6-year pricing
- `onboarding_complete = false` logic
- Role-based revenue calculations
- Added `onboarding_revenue` field
