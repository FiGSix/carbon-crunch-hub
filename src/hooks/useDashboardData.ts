import { useMemo, useCallback } from 'react';
import { useProposals } from './useProposals';
import { useAuth } from '@/contexts/auth';
import { useDashboardMetricsByStage } from './dashboard/useDashboardMetricsByStage';
import { useDashboardHelpers } from './dashboard/useDashboardHelpers';
import { DashboardData } from './dashboard/types';

/**
 * Main dashboard data hook - now using the new metrics system
 * Migrated from deprecated useDashboardComputedData to useDashboardMetricsByStage
 */
export function useDashboardData(): DashboardData {
  const { proposals, loading, error, fetchProposals } = useProposals();
  const { userRole } = useAuth();
  
  // Get metrics using the new Phase 5 metrics system
  const { data: metrics, isLoading: metricsLoading } = useDashboardMetricsByStage();
  
  // Get helper functions using the new hook
  const helpers = useDashboardHelpers(fetchProposals);

  // Stable filter predicates
  const isPending = useCallback((p: any) => p.status === 'pending', []);
  const isSigned = useCallback((p: any) => p.status === 'signed', []);

  // Calculate recent proposals (last 5)
  const recentProposals = useMemo(() => {
    return proposals
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5);
  }, [proposals]);

  // Memoize filtered proposal counts
  const proposalCounts = useMemo(() => ({
    pending: proposals.filter(isPending).length,
    signed: proposals.filter(isSigned).length,
  }), [proposals, isPending, isSigned]);

  // Memoize the final result to prevent unnecessary re-renders
  const result = useMemo((): DashboardData => ({
    // Auth data
    userRole,
    
    // Proposal data
    proposals,
    recentProposals,
    
    // Loading states
    loading: loading || metricsLoading,
    error,
    
    // Legacy computed data (maintained for backwards compatibility)
    stats: {
      totalProposals: proposals.length,
      pendingProposals: proposalCounts.pending,
      approvedProposals: proposalCounts.signed,
      totalRevenue: 0,
      totalEnergyOffset: 0
    },
    chartData: [],
    portfolioSize: 0,
    totalProposals: proposals.length,
    potentialRevenue: 0,
    co2Offset: 0,
    
    // Helper functions
    ...helpers
  }), [
    userRole,
    proposals,
    recentProposals,
    loading,
    metricsLoading,
    error,
    helpers,
    proposalCounts
  ]);

  return result;
}
