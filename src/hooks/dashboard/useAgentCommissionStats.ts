
import { useMemo } from 'react';
import { ProposalListItem } from '@/types/proposals';

export interface AgentCommissionStats {
  filteredRevenue: number;
  projectedCommission: number;
  filteredProposalsCount: number;
}

export function useAgentCommissionStats(proposals: ProposalListItem[]): AgentCommissionStats {
  return useMemo(() => {
    console.log("Calculating agent commission stats for", proposals.length, "proposals");
    
    // Filter proposals to only include pending and approved
    const filteredProposals = proposals.filter(p => 
      p.status === 'pending' || 
      p.status === 'draft' || 
      p.status === 'approved' || 
      p.status === 'signed'
    );
    
    // Calculate commission revenue from stored commission data in proposal content
    // This now uses the actual stored commission data instead of calculating on the fly
    const projectedCommission = filteredProposals.reduce((sum, proposal) => {
      // Try to get stored agent commission data from proposal content
      if (proposal.content?.agentCommissionRevenue) {
        // Sum all years of commission revenue from stored data
        const totalCommissionForProposal = Object.values(proposal.content.agentCommissionRevenue)
          .reduce((total, yearRevenue) => total + (yearRevenue || 0), 0);
        return sum + totalCommissionForProposal;
      }
      
      // Fallback to calculated commission if stored data is not available
      const proposalRevenue = proposal.revenue || 0;
      const commissionPercentage = proposal.agent_commission_percentage || 0;
      const commissionRevenue = (proposalRevenue * commissionPercentage) / 100;
      
      // Project commission over remaining years until 2030
      const currentYear = new Date().getFullYear();
      const targetYear = 2030;
      const yearsRemaining = Math.max(0, targetYear - currentYear);
      const totalProjectedCommission = commissionRevenue * yearsRemaining;
      
      return sum + totalProjectedCommission;
    }, 0);
    
    // Calculate filtered revenue (first year commission only)
    const filteredRevenue = filteredProposals.reduce((sum, proposal) => {
      if (proposal.content?.agentCommissionRevenue) {
        // Get current year commission from stored data
        const currentYear = new Date().getFullYear().toString();
        const currentYearCommission = proposal.content.agentCommissionRevenue[currentYear] || 0;
        return sum + currentYearCommission;
      }
      
      // Fallback calculation
      const proposalRevenue = proposal.revenue || 0;
      const commissionPercentage = proposal.agent_commission_percentage || 0;
      const commissionRevenue = (proposalRevenue * commissionPercentage) / 100;
      return sum + commissionRevenue;
    }, 0);
    
    console.log("Agent commission calculation results:", {
      filteredProposalsCount: filteredProposals.length,
      projectedCommission: Math.round(projectedCommission),
      filteredRevenue: Math.round(filteredRevenue),
      hasStoredCommissionData: filteredProposals.some(p => p.content?.agentCommissionRevenue)
    });
    
    return {
      filteredRevenue: Math.round(filteredRevenue),
      projectedCommission: Math.round(projectedCommission),
      filteredProposalsCount: filteredProposals.length
    };
  }, [proposals]);
}
