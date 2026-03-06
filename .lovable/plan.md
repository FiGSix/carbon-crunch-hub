

# Dead Code Cleanup Plan

## Verified Dead Files to Delete

### Tier 1: Completely Orphaned Files (zero imports anywhere)

| File | Why it's dead |
|------|---------------|
| `src/pages/MyClientsOptimized.tsx` | No route, no import. `MyClients2.tsx` is active. |
| `src/hooks/useAuthSimplified.ts` | Zero imports. Dead compatibility shim. |
| `src/components/debug/RenderTracker.tsx` | Zero imports. |
| `src/lib/dev/devUtils.tsx` | Zero imports. |
| `src/hooks/dashboard/useOptimizedDashboardData.ts` | Zero external imports. |
| `src/hooks/dashboard/useOptimizedDashboardStatsHook.ts` | Zero external imports. |
| `src/hooks/dashboard/useOptimizedDashboardStatsVersion.ts` | Zero external imports. |
| `src/hooks/dashboard/useUnifiedDashboardData.ts` | Zero external imports. |
| `src/hooks/dashboard/useOptimizedAgentPortfolio.ts` | Zero external imports. |
| `src/services/optimizedDataService.ts` | Zero external imports. |
| `src/lib/performance/BundleOptimization.ts` | Zero imports (comments-only file). |
| `src/docs/*.md` (5 files) | Documentation inside src/. Does not belong in the build tree. |

### Tier 2: Orphan Chains (only imported by other dead code)

These form dependency chains where nothing at the top is actually consumed:

| File | Only imported by |
|------|-----------------|
| `src/hooks/dashboard/useDashboardComputedData.ts` | Only re-exported in `index.ts`, zero consumers |
| `src/hooks/dashboard/useOptimizedDashboardComputedData.ts` | Only by `useDashboardComputedData` (dead) |
| `src/hooks/dashboard/useDashboardStats.ts` | Only by `useOptimizedDashboardComputedData` (dead) |
| `src/hooks/dashboard/useOptimizedDashboardStats.ts` | Only by `useDashboardStats` + `useOptimizedDashboardComputedData` (both dead) |
| `src/hooks/dashboard/useDashboardPerformanceTracking.ts` | Only re-exported in `index.ts`, zero consumers |
| `src/lib/performance/DashboardPerformanceMonitor.ts` | Only by `useDashboardPerformanceTracking` (dead) |

**Note**: `useAgentCommissionStats` and `useOptimizedAgentCommissionStats` are only imported by the dead chain above and `types.ts`. However, `types.ts` is used by active code, so we need to update the type import in `types.ts` before deleting these. I will verify this carefully during implementation.

### Tier 3: Dev/Debug Pages & Routes to Remove

| Item | Action |
|------|--------|
| `src/pages/SimplifiedIndex.tsx` | Delete file. Currently **eagerly imported** in App.tsx, bloating the production bundle for a debug-only `/debug-home` route. |
| `src/pages/EmbeddedGame.tsx` | Delete file. Eagerly imported for a `/game` route embedding an external iframe. |
| `src/pages/TestPage.tsx` | Delete file. Dev-gated but still in tree. |
| `src/pages/TestingSuite.tsx` | Delete file. Dev-gated route at `/testing`. |
| `src/components/testing/ComprehensiveTestSuite.tsx` | Delete. Only used by TestingSuite. |
| `src/components/testing/CSSFailureSimulator.tsx` | Delete. Only used by TestingSuite. |
| `src/components/diagnostics/CSSFallbackDiagnostics.tsx` | Delete. Only used by SimplifiedIndex + TestingSuite (both being deleted). |
| `src/components/diagnostics/DisplayDiagnostics.tsx` | Keep -- still lazy-loaded in App.tsx for dev mode. |

### Tier 4: App.tsx Cleanup

Changes to `src/App.tsx`:
1. Remove eager imports of `SimplifiedIndex` and `EmbeddedGame` (lines 25, 27)
2. Remove `TestPage` lazy import block (lines 37-39)
3. Remove `TestingSuite` lazy import (line 53)
4. Remove the `/debug-home` route (lines 175-179)
5. Remove the `/game` route (lines 284-285)
6. Remove the `/test` route block (lines 147-159)
7. Remove the `/testing` route block (lines 160-174)

### Tier 5: Dashboard index.ts Cleanup

Update `src/hooks/dashboard/index.ts` to remove re-exports of deleted hooks:
- Remove `useDashboardStats` export
- Remove `useDashboardComputedData` export
- Remove `useDashboardPerformanceTracking` export

## What We Are NOT Touching

- `ConsoleReplacementUtility` -- 39 files depend on it
- `DisplayDiagnostics` -- still used in App.tsx dev mode
- `useDashboardHelpers` -- actively used by Dashboard page
- `useDashboardMetricsByStage` -- actively used
- All vintage/revenue/referral/pending hooks -- actively used
- `src/services/optimizedRealtimeService.ts` -- re-export shim, low risk but consumers exist
- Carbon calculation consolidation -- separate phase to avoid breaking changes

## Impact

- ~25 files deleted
- ~200-300 lines removed from App.tsx route definitions
- Production bundle reduced (two eagerly-imported pages removed)
- Dashboard hooks directory goes from 21 files to ~10 actively-used files

