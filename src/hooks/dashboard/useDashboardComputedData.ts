
import { useMemo } from 'react';
import { ProposalListItem } from '@/types/proposals';
import { DashboardComputedData } from './types';
import { useOptimizedDashboardComputedData } from './useOptimizedDashboardComputedData';

/**
 * @deprecated This hook is deprecated as of Phase 5 dashboard refactoring.
 * Use `useDashboardMetricsByStage` instead for the new 4-card dashboard layout.
 * 
 * This hook is kept for backward compatibility with existing code but will be
 * removed in a future version. Please migrate to the new metrics system.
 * 
 * @see useDashboardMetricsByStage
 */
export function useDashboardComputedData(proposals: ProposalListItem[], userRole: string | null): DashboardComputedData {
  // Use the optimized version for better performance
  return useOptimizedDashboardComputedData(proposals, userRole);
}
