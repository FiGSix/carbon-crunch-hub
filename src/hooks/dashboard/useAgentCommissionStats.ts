
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
    
    // Calculate commission revenue from filtered proposals
    const filteredRevenue = filteredProposals.reduce((sum, p) => {
      const proposalRevenue = p.revenue || 0;
      const commissionPercentage = p.agent_commission_percentage || 0;
      const commissionRevenue = (proposalRevenue * commissionPercentage) / 100;
      return sum + commissionRevenue;
    }, 0);
    
    // Project commission over entire period until 2030
    // Assuming commission is paid annually from commission date until 2030
    const currentYear = new Date().getFullYear();
    const targetYear = 2030;
    const projectedCommission = filteredProposals.reduce((sum, p) => {
      const proposalRevenue = p.revenue || 0;
      const commissionPercentage = p.agent_commission_percentage || 0;
      const annualCommission = (proposalRevenue * commissionPercentage) / 100;
      
      // Calculate years remaining from now until 2030
      const yearsRemaining = Math.max(0, targetYear - currentYear);
      const totalProjectedCommission = annualCommission * yearsRemaining;
      
      return sum + totalProjectedCommission;
    }, 0);
    
    return {
      filteredRevenue: Math.round(filteredRevenue),
      projectedCommission: Math.round(projectedCommission),
      filteredProposalsCount: filteredProposals.length
    };
  }, [proposals]);
}
