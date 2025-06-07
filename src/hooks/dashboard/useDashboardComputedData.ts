
import { useMemo } from 'react';
import { ProposalListItem } from '@/types/proposals';
import { DashboardComputedData } from './types';
import { useDashboardStats } from './useDashboardStats';
import { useAgentCommissionStats } from './useAgentCommissionStats';
import { normalizeToKWp } from '@/lib/calculations/carbon';

export function useDashboardComputedData(proposals: ProposalListItem[], userRole: string | null): DashboardComputedData {
  const stats = useDashboardStats(proposals, userRole);
  const agentCommissionStats = useAgentCommissionStats(proposals);
  
  return useMemo(() => {
    console.log("Computing dashboard data for role:", userRole);
    
    // Calculate portfolio size (total system size for agents, proposal count for others)
    const portfolioSize = userRole === 'agent' 
      ? proposals.reduce((sum, p) => sum + normalizeToKWp(p.size || 0), 0)
      : proposals.length;
    
    // Get recent proposals (last 5)
    const recentProposals = proposals
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5);
    
    // Chart data is all proposals
    const chartData = proposals;
    
    // Calculate potential revenue based on role
    let potentialRevenue = 0;
    if (userRole === 'agent') {
      // Use projected commission for agents
      potentialRevenue = agentCommissionStats.projectedCommission;
    } else {
      // Use total revenue for other roles
      potentialRevenue = stats.totalRevenue;
    }
    
    // Calculate CO2 offset
    const co2Offset = Math.round(proposals.reduce((sum, p) => sum + (p.carbon_credits || 0), 0));
    
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
      co2Offset
    };
  }, [proposals, userRole, stats, agentCommissionStats]);
}
