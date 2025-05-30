
import { useMemo } from 'react';
import { ProposalListItem } from '@/types/proposals';
import { DashboardStats } from './types';

export function useDashboardStats(proposals: ProposalListItem[], userRole: string | null): DashboardStats {
  return useMemo(() => {
    console.log("Recalculating dashboard stats for", proposals.length, "proposals");
    
    // Calculate revenue based on user role
    let totalRevenue = 0;
    if (userRole === 'agent') {
      // For agents: calculate commission-based revenue
      totalRevenue = proposals.reduce((sum, p) => {
        const proposalRevenue = p.revenue || 0;
        const commissionPercentage = p.agent_commission_percentage || 0;
        const commissionRevenue = (proposalRevenue * commissionPercentage) / 100;
        return sum + commissionRevenue;
      }, 0);
    } else {
      // For other roles: use total revenue
      totalRevenue = proposals.reduce((sum, p) => sum + (p.revenue || 0), 0);
    }
    
    return {
      totalProposals: proposals.length,
      pendingProposals: proposals.filter(p => p.status === 'pending' || p.status === 'draft').length,
      approvedProposals: proposals.filter(p => p.status === 'approved' || p.status === 'signed').length,
      totalRevenue: Math.round(totalRevenue), // Round to avoid decimal precision issues
      totalEnergyOffset: proposals.reduce((sum, p) => sum + (p.annual_energy || 0), 0)
    };
  }, [proposals, userRole]);
}
