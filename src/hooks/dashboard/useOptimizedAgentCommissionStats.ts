
import { useMemo } from 'react';
import { ProposalListItem } from '@/types/proposals';
import { logger } from '@/lib/logger';

export interface AgentCommissionStats {
  projectedCommission: number;
  filteredProposalsCount: number;
}

export function useOptimizedAgentCommissionStats(proposals: ProposalListItem[]): AgentCommissionStats {
  const commissionLogger = logger.withContext({
    component: 'OptimizedAgentCommissionStats',
    feature: 'commission-calculations'
  });

  return useMemo(() => {
    try {
      commissionLogger.info("Optimized: Calculating agent commission stats", {
        totalProposals: proposals.length
      });

      // Single loop to filter and calculate commission at once
      const result = proposals.reduce((acc, proposal) => {
        // Filter condition: active proposals (not archived, deleted, or rejected)
        if (proposal.archived_at || proposal.status === 'rejected') {
          return acc;
        }
        
        // Count active proposals
        acc.filteredProposalsCount++;
        
        // Calculate commission for this proposal
        const commissionRate = proposal.agent_commission_percentage || 4; // fallback to 4%
        const carbonCredits = proposal.carbon_credits || 0;
        const carbonPricePerCredit = 95; // R95 per tCO₂
        const totalCarbonRevenue = carbonCredits * carbonPricePerCredit * 10; // 10 years
        const proposalCommission = totalCarbonRevenue * (commissionRate / 100);
        
        acc.projectedCommission += proposalCommission;
        
        commissionLogger.debug("Optimized: Proposal commission calculation", {
          proposalId: proposal.id,
          commissionRate,
          carbonCredits,
          carbonPricePerCredit,
          totalCarbonRevenue,
          proposalCommission
        });

        return acc;
      }, {
        projectedCommission: 0,
        filteredProposalsCount: 0
      });

      const finalResult = {
        projectedCommission: Math.round(result.projectedCommission),
        filteredProposalsCount: result.filteredProposalsCount
      };

      commissionLogger.info("Optimized: Commission stats calculated", finalResult);
      
      return finalResult;

    } catch (error) {
      commissionLogger.error("Optimized: Error calculating commission stats", { error });
      return {
        projectedCommission: 0,
        filteredProposalsCount: 0
      };
    }
  }, [proposals, commissionLogger]);
}
