
import { useMemo } from 'react';
import { ProposalListItem } from '@/types/proposals';
import { DashboardStats } from './types';
import { useOptimizedDashboardStats } from './useOptimizedDashboardStats';

export function useDashboardStats(proposals: ProposalListItem[], userRole: string | null): DashboardStats {
  // Use the optimized version for better performance
  return useOptimizedDashboardStats(proposals, userRole);
}
