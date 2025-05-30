
import { useMemo, useRef, useEffect } from 'react';
import { ProposalListItem } from '@/types/proposals';
import { DashboardComputedData, ComputedDataCache } from './types';
import { useDashboardStats } from './useDashboardStats';

export function useDashboardComputedData(
  proposals: ProposalListItem[], 
  userRole: string | null
): DashboardComputedData {
  // Use ref to cache computed values and prevent unnecessary recalculations
  const computedDataRef = useRef<ComputedDataCache | null>(null);

  // Calculate stats
  const stats = useDashboardStats(proposals, userRole);

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

  // Portfolio size calculation - different logic for agents vs other roles
  const portfolioSize = useMemo(() => {
    if (userRole === 'agent') {
      // For agents: sum system_size_kwp from approved proposals only
      const approvedProposals = proposals.filter(p => 
        p.status === 'approved' || p.status === 'signed'
      );
      
      const totalKwp = approvedProposals.reduce((sum, p) => {
        // Use the system_size_kwp which should now be properly populated by the transformer
        const systemSize = p.system_size_kwp || 0;
        return sum + systemSize;
      }, 0);
      
      console.log("Agent portfolio calculation:", {
        totalProposals: proposals.length,
        approvedProposals: approvedProposals.length,
        totalKwp,
        proposals: approvedProposals.map(p => ({
          id: p.id,
          title: p.title,
          status: p.status,
          system_size_kwp: p.system_size_kwp,
          size: p.size
        }))
      });
      
      return totalKwp;
    } else {
      // For other roles: use total number of proposals
      return proposals.length;
    }
  }, [proposals, userRole]);

  // Computed values from stats
  const totalProposals = useMemo(() => stats.totalProposals, [stats.totalProposals]);
  const potentialRevenue = useMemo(() => stats.totalRevenue, [stats.totalRevenue]);
  const co2Offset = useMemo(() => stats.totalEnergyOffset, [stats.totalEnergyOffset]);

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

  return {
    stats,
    recentProposals,
    chartData,
    portfolioSize,
    totalProposals,
    potentialRevenue,
    co2Offset
  };
}
