
import { useMemo } from 'react';
import { ProposalListItem } from '@/types/proposals';
import { logger } from '@/lib/logger';

interface AgentCommissionStats {
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

      // Calculate total projected commission using stored commission percentages
      const totalProjectedCommission = activeProposals.reduce((total, proposal) => {
        // Use the stored agent commission percentage from the proposal
        const commissionRate = proposal.agent_commission_percentage || 4; // fallback to 4%
        const annualEnergy = proposal.annual_energy || 0;
        
        // Estimate annual revenue based on energy production (using R0.95 per kWh as baseline)
        const estimatedAnnualRevenue = annualEnergy * 0.95;
        
        // Calculate commission for this proposal (over 10 years)
        const proposalCommission = estimatedAnnualRevenue * (commissionRate / 100) * 10;
        
        commissionLogger.debug("Proposal commission calculation", {
          proposalId: proposal.id,
          commissionRate,
          annualEnergy,
          estimatedAnnualRevenue,
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
