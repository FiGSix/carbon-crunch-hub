
import { useMemo } from 'react';
import { ProposalListItem } from '@/types/proposals';
import { DashboardStats } from './types';

/**
 * @deprecated This hook is deprecated as of Phase 5 dashboard refactoring.
 * Use `useDashboardMetricsByStage` instead for the new 4-card dashboard layout.
 * 
 * This hook is kept for backward compatibility with existing code but will be
 * removed in a future version. Please migrate to the new metrics system which
 * fetches data directly from the database with better performance.
 * 
 * @see useDashboardMetricsByStage
 */
export function useOptimizedDashboardStats(proposals: ProposalListItem[], userRole: string | null): DashboardStats {
  return useMemo(() => {
    console.log("Optimized: Recalculating dashboard stats for", proposals.length, "proposals");
    
    // Single loop to calculate all stats at once
    const stats = proposals.reduce((acc, proposal) => {
      // Count totals
      acc.totalProposals++;
      
      // Count by status
      if (proposal.status === 'pending' || proposal.status === 'draft') {
        acc.pendingProposals++;
      } else if (proposal.status === 'approved' || proposal.status === 'signed') {
        acc.approvedProposals++;
      }
      
      // Calculate revenue based on user role
      if (userRole === 'agent') {
        const proposalRevenue = proposal.revenue || 0;
        const commissionPercentage = proposal.agent_commission_percentage || 0;
        const commissionRevenue = (proposalRevenue * commissionPercentage) / 100;
        acc.totalRevenue += commissionRevenue;
      } else {
        acc.totalRevenue += proposal.revenue || 0;
      }
      
      // Calculate energy offset
      acc.totalEnergyOffset += proposal.annual_energy || 0;
      
      return acc;
    }, {
      totalProposals: 0,
      pendingProposals: 0,
      approvedProposals: 0,
      totalRevenue: 0,
      totalEnergyOffset: 0
    });
    
    return {
      ...stats,
      totalRevenue: Math.round(stats.totalRevenue) // Round to avoid decimal precision issues
    };
  }, [proposals, userRole]);
}
