
import { useMemo } from 'react';
import { ProposalListItem } from '@/types/proposals';
import { DashboardComputedData } from './types';
import { useOptimizedDashboardStats } from './useOptimizedDashboardStats';
import { useOptimizedAgentCommissionStats } from './useOptimizedAgentCommissionStats';
import { UnifiedDashboardCalculations } from '@/services/dashboard/UnifiedDashboardCalculations';

export function useOptimizedDashboardComputedData(proposals: ProposalListItem[], userRole: string | null): DashboardComputedData {
  const stats = useOptimizedDashboardStats(proposals, userRole);
  const agentCommissionStats = useOptimizedAgentCommissionStats(proposals);
  
  return useMemo(() => {
    console.log("Optimized: Computing dashboard data for role:", userRole);
    
    // Use unified calculations for comprehensive metrics
    const unifiedMetrics = UnifiedDashboardCalculations.calculateAllMetrics(proposals, userRole);
    
    // Single operation to sort and get recent proposals (avoiding separate sort + slice)
    const recentProposals = proposals
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5);
    
    // Chart data is all proposals (no additional processing needed)
    const chartData = proposals;
    
    // Calculate portfolio size based on role
    const portfolioSize = userRole === 'agent' 
      ? unifiedMetrics.portfolioSize
      : proposals.length;
    
    // Calculate potential revenue based on role
    const potentialRevenue = userRole === 'agent' 
      ? agentCommissionStats.projectedCommission 
      : stats.totalRevenue;
    
    return {
      stats: {
        ...stats,
        // Include agent-specific stats for agents
        ...(userRole === 'agent' && {
          agentCommissionStats
        })
      },
      recentProposals,
      chartData,
      portfolioSize,
      totalProposals: stats.totalProposals,
      potentialRevenue,
      co2Offset: unifiedMetrics.co2Offset
    };
  }, [proposals, userRole, stats, agentCommissionStats]);
}
