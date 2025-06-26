
import { ProposalListItem } from '@/types/proposals';
import { normalizeToKWp } from '@/lib/calculations/carbon';

export interface UnifiedDashboardMetrics {
  // Basic stats
  totalProposals: number;
  pendingProposals: number;
  approvedProposals: number;
  
  // Financial metrics
  totalRevenue: number;
  agentCommission: number;
  
  // Environmental metrics
  portfolioSize: number;
  co2Offset: number;
  totalEnergyOffset: number;
  
  // Agent-specific metrics
  activeProposalsCount: number;
  projectedCommission: number;
}

export class UnifiedDashboardCalculations {
  /**
   * Calculate all dashboard metrics in a single pass through the proposals array
   */
  static calculateAllMetrics(
    proposals: ProposalListItem[], 
    userRole: string | null
  ): UnifiedDashboardMetrics {
    
    // Single loop to calculate everything at once
    const metrics = proposals.reduce((acc, proposal) => {
      // Basic counting
      acc.totalProposals++;
      
      // Status-based counting
      if (proposal.status === 'pending' || proposal.status === 'draft') {
        acc.pendingProposals++;
      } else if (proposal.status === 'approved' || proposal.status === 'signed') {
        acc.approvedProposals++;
      }
      
      // Environmental metrics
      const systemSize = proposal.system_size_kwp || 0;
      const carbonCredits = proposal.carbon_credits || 0;
      const annualEnergy = proposal.annual_energy || 0;
      
      acc.portfolioSize += normalizeToKWp(proposal.size || systemSize);
      acc.co2Offset += carbonCredits;
      acc.totalEnergyOffset += annualEnergy;
      
      // Financial calculations based on role
      const proposalRevenue = proposal.revenue || 0;
      
      if (userRole === 'agent') {
        // Agent-specific calculations
        const commissionPercentage = proposal.agent_commission_percentage || 0;
        const commissionRevenue = (proposalRevenue * commissionPercentage) / 100;
        acc.totalRevenue += commissionRevenue;
        
        // Agent commission calculations (only for active proposals)
        if (!proposal.archived_at && proposal.status !== 'rejected') {
          acc.activeProposalsCount++;
          
          const commissionRate = proposal.agent_commission_percentage || 4;
          const carbonPricePerCredit = 95;
          const totalCarbonRevenue = carbonCredits * carbonPricePerCredit * 10; // 10 years
          const proposalCommission = totalCarbonRevenue * (commissionRate / 100);
          
          acc.projectedCommission += proposalCommission;
        }
      } else {
        // Non-agent revenue calculation
        acc.totalRevenue += proposalRevenue;
      }
      
      return acc;
    }, {
      totalProposals: 0,
      pendingProposals: 0,
      approvedProposals: 0,
      totalRevenue: 0,
      agentCommission: 0,
      portfolioSize: 0,
      co2Offset: 0,
      totalEnergyOffset: 0,
      activeProposalsCount: 0,
      projectedCommission: 0
    });

    // Round financial values to avoid precision issues
    return {
      ...metrics,
      totalRevenue: Math.round(metrics.totalRevenue),
      projectedCommission: Math.round(metrics.projectedCommission),
      co2Offset: Math.round(metrics.co2Offset)
    };
  }
}
