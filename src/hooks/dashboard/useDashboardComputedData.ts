
import { useMemo } from 'react';
import { ProposalListItem } from '@/types/proposals';
import { DashboardComputedData } from './types';
import { useOptimizedDashboardComputedData } from './useOptimizedDashboardComputedData';

export function useDashboardComputedData(proposals: ProposalListItem[], userRole: string | null): DashboardComputedData {
  // Use the optimized version for better performance
  return useOptimizedDashboardComputedData(proposals, userRole);
}
