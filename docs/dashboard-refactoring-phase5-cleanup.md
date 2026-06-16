# Dashboard Refactoring - Phase 5 Cleanup Summary

**Date:** 2025-10-19  
**Phase:** 5 of 10  
**Purpose:** Remove deprecated components and code after implementing new dashboard metrics system

---

## Files Deleted

The following component files were removed as they are no longer used in the new dashboard design:

### 1. ✅ `src/components/dashboard/sections/OptimizedStatsCardsSection.tsx`
- **Reason:** Replaced by `DashboardMetricsByStageCards.tsx`
- **Old Purpose:** Displayed 4 legacy metric cards (Portfolio Size, Total Proposals, Potential Revenue, CO₂ Offset)
- **New Replacement:** `DashboardMetricsByStageCards` shows 4 new pipeline-stage metrics

### 2. ✅ `src/components/dashboard/sections/StatsCardsSection.tsx`
- **Reason:** Old stats card layout no longer needed
- **Old Purpose:** Displayed various dashboard stats including commission cards
- **New Replacement:** New metrics system with `DashboardMetricsByStageCards`

### 3. ✅ `src/components/dashboard/sections/ChartsSection.tsx`
- **Reason:** Charts removed from dashboard as per requirements
- **Old Purpose:** Displayed Revenue Chart and CO₂ Offset Chart
- **New Replacement:** None - charts intentionally removed

### 4. ✅ `src/components/dashboard/preview/OptimizedCommissionCard.tsx`
- **Reason:** Commission card removed from dashboard
- **Old Purpose:** Displayed agent commission information
- **New Replacement:** None - simplified dashboard focuses on project pipeline

### 5. ✅ `src/components/dashboard/preview/CommissionProjectionCard.tsx`
- **Reason:** Commission projection card removed from dashboard
- **Old Purpose:** Displayed projected commission until 2030
- **New Replacement:** None - revenue now shown in "Total Revenue (2025-2030)" card

### 6. ✅ `src/components/dashboard/preview/DealStatusCard.tsx`
- **Reason:** Deal status visualization removed
- **Old Purpose:** Displayed deal status breakdown chart
- **New Replacement:** Status information available in Recent Projects table

---

## Deprecated Hooks (Kept for Backward Compatibility)

The following hooks are deprecated but kept to avoid breaking existing code:

### 1. ⚠️ `useDashboardComputedData`
- **Status:** Deprecated but functional
- **Location:** `src/hooks/dashboard/useDashboardComputedData.ts`
- **Migration Path:** Use `useDashboardMetricsByStage` instead
- **Reason for Keeping:** Still used by `useDashboardData.ts`
- **Removal Plan:** Will be removed in future version after full migration

### 2. ⚠️ `useOptimizedDashboardStats`
- **Status:** Deprecated but functional
- **Location:** `src/hooks/dashboard/useOptimizedDashboardStats.ts`
- **Migration Path:** Use `useDashboardMetricsByStage` instead
- **Reason for Keeping:** Still used by multiple dashboard computation files
- **Removal Plan:** Will be removed in future version after full migration

---

## What Remains

### Active Dashboard Components
- ✅ `DashboardMetricsByStageCards` - New 4-card metrics display
- ✅ `RecentProjectsNew` - Recent projects table (unchanged)
- ✅ `StatsCard` - Reusable card component (still used)
- ✅ `DashboardHeader` - Header component (unchanged)

### Active Dashboard Hooks
- ✅ `useDashboardMetricsByStage` - **NEW** - Fetches 4 key metrics from database
- ✅ `useUnifiedDashboardData` - Fetches proposals for Recent Projects
- ✅ `useDashboardHelpers` - Helper functions for dashboard
- ⚠️ `useDashboardComputedData` - Deprecated (backward compatibility)
- ⚠️ `useOptimizedDashboardStats` - Deprecated (backward compatibility)

---

## Dashboard Structure (After Phase 5)

```
Dashboard Page
├── DashboardHeader (with Refresh button)
├── DashboardMetricsByStageCards (4 cards)
│   ├── Card 1: Audit Ready Projects (MWp)
│   ├── Card 2: Total Revenue 2025-2030 (Rands)
│   ├── Card 3: Onboarding Projects (MWp)
│   └── Card 4: Proposals Pending (MWp)
└── RecentProjectsNew (proposals table)
```

---

## Migration Guide for Developers

If you have custom code using the deprecated components or hooks:

### Before (Old Approach)
```tsx
import { OptimizedStatsCardsSection } from '@/components/dashboard/sections/OptimizedStatsCardsSection';

<OptimizedStatsCardsSection 
  userRole={userRole}
  portfolioSize={portfolioSize}
  totalProposals={totalProposals}
  potentialRevenue={potentialRevenue}
  co2Offset={co2Offset}
/>
```

### After (New Approach)
```tsx
import { DashboardMetricsByStageCards } from '@/components/dashboard/sections/DashboardMetricsByStageCards';
import { useDashboardMetricsByStage } from '@/hooks/dashboard/useDashboardMetricsByStage';

const { data: metrics, isLoading } = useDashboardMetricsByStage();

<DashboardMetricsByStageCards 
  metrics={metrics || getEmptyMetrics()}
  loading={isLoading}
/>
```

---

## Benefits of New System

1. **Database-Level Optimization:** Metrics calculated in PostgreSQL function, not client-side
2. **Reduced Complexity:** Fewer components, cleaner code structure
3. **Better Performance:** Single optimized query instead of multiple computations
4. **Role-Based Filtering:** Database handles access control, not frontend
5. **Simplified Dashboard:** Focus on core metrics that matter
6. **Maintainable:** Less code to maintain and test

---

## Next Steps

- **Phase 6:** Test all role types (admin/agent/client)
- **Phase 7:** Performance testing and optimization
- **Phase 8:** Update documentation
- **Phase 9:** Train team on new dashboard
- **Phase 10:** Remove deprecated hooks after full migration

---

## Questions or Issues?

If you encounter any issues related to this cleanup:
1. Check if you're using any deleted components
2. Migrate to the new `useDashboardMetricsByStage` hook
3. Review the deprecation warnings in your IDE
4. Consult the main dashboard refactoring plan document
