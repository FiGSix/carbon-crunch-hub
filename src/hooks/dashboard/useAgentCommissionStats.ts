
import { useMemo } from 'react';
import { ProposalListItem } from '@/types/proposals';
import { logger } from '@/lib/logger';

export interface AgentCommissionStats {
  projectedCommission: number;
  filteredProposalsCount: number;
}

export function useAgentCommissionStats(proposals: ProposalListItem[]): AgentCommissionStats {
  const commissionLogger = logger.withContext({
    component: 'AgentCommissionStats',
    feature: 'commission-calculations'
  });

  return useMemo(() => {
    try {
      // Filter to active proposals (not archived, deleted, or rejected)
      const activeProposals = proposals.filter(proposal => 
        !proposal.archived_at && 
        proposal.status !== 'rejected'
      );

      commissionLogger.info("Calculating agent commission stats", {
        totalProposals: proposals.length,
        activeProposals: activeProposals.length
      });

      // Calculate total projected commission using carbon credits and proper pricing
      const totalProjectedCommission = activeProposals.reduce((total, proposal) => {
        // Use the stored agent commission percentage from the proposal
        const commissionRate = proposal.agent_commission_percentage || 4; // fallback to 4%
        const carbonCredits = proposal.carbon_credits || 0;
        
        // Use a baseline carbon price of R95 per tCO₂ (this should match the pricing service)
        const carbonPricePerCredit = 95;
        
        // Calculate total revenue from carbon credits over the crediting period (typically 10 years)
        const totalCarbonRevenue = carbonCredits * carbonPricePerCredit * 10;
        
        // Calculate agent commission for this proposal
        const proposalCommission = totalCarbonRevenue * (commissionRate / 100);
        
        commissionLogger.debug("Proposal commission calculation", {
          proposalId: proposal.id,
          commissionRate,
          carbonCredits,
          carbonPricePerCredit,
          totalCarbonRevenue,
          proposalCommission
        });

        return total + proposalCommission;
      }, 0);

      const result = {
        projectedCommission: Math.round(totalProjectedCommission),
        filteredProposalsCount: activeProposals.length
      };

      commissionLogger.info("Commission stats calculated", result);
      
      return result;

    } catch (error) {
      commissionLogger.error("Error calculating commission stats", { error });
      return {
        projectedCommission: 0,
        filteredProposalsCount: 0
      };
    }
  }, [proposals, commissionLogger]);
}
