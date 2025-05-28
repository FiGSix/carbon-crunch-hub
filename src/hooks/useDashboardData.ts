
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useProposals } from './useProposals';
import { ProposalListItem } from '@/types/proposals';

interface DashboardStats {
  totalProposals: number;
  pendingProposals: number;
  approvedProposals: number;
  totalRevenue: number;
  totalEnergyOffset: number;
}

interface DashboardData {
  stats: DashboardStats;
  recentProposals: ProposalListItem[];
  chartData: ProposalListItem[];
  loading: boolean;
  error: string | null;
}

export function useDashboardData(): DashboardData {
  const { proposals, loading, error } = useProposals();
  
  // Use ref to cache computed values and prevent unnecessary recalculations
  const computedDataRef = useRef<{
    proposals: ProposalListItem[];
    stats: DashboardStats;
    recentProposals: ProposalListItem[];
    chartData: ProposalListItem[];
  } | null>(null);

  // Memoized stats calculation with proper dependency tracking
  const stats = useMemo(() => {
    // Check if we can use cached data
    if (computedDataRef.current && 
        computedDataRef.current.proposals === proposals && 
        proposals.length > 0) {
      return computedDataRef.current.stats;
    }

    console.log("Recalculating dashboard stats for", proposals.length, "proposals");
    
    const newStats: DashboardStats = {
      totalProposals: proposals.length,
      pendingProposals: proposals.filter(p => p.status === 'pending' || p.status === 'draft').length,
      approvedProposals: proposals.filter(p => p.status === 'approved' || p.status === 'signed').length,
      totalRevenue: proposals.reduce((sum, p) => sum + (p.revenue || 0), 0),
      totalEnergyOffset: proposals.reduce((sum, p) => sum + (p.annual_energy || 0), 0)
    };

    return newStats;
  }, [proposals]);

  // Memoized recent proposals (last 5, sorted by date)
  const recentProposals = useMemo(() => {
    // Check if we can use cached data
    if (computedDataRef.current && 
        computedDataRef.current.proposals === proposals && 
        proposals.length > 0) {
      return computedDataRef.current.recentProposals;
    }

    const sorted = [...proposals]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5);
    
    return sorted;
  }, [proposals]);

  // Memoized chart data (proposals with revenue > 0)
  const chartData = useMemo(() => {
    // Check if we can use cached data
    if (computedDataRef.current && 
        computedDataRef.current.proposals === proposals && 
        proposals.length > 0) {
      return computedDataRef.current.chartData;
    }

    const filtered = proposals.filter(p => (p.revenue || 0) > 0);
    return filtered;
  }, [proposals]);

  // Update cache when calculations are done
  useEffect(() => {
    if (proposals.length > 0) {
      computedDataRef.current = {
        proposals,
        stats,
        recentProposals,
        chartData
      };
    }
  }, [proposals, stats, recentProposals, chartData]);

  // Memoize the final result to prevent unnecessary re-renders
  const result = useMemo((): DashboardData => ({
    stats,
    recentProposals,
    chartData,
    loading,
    error
  }), [stats, recentProposals, chartData, loading, error]);

  return result;
}
