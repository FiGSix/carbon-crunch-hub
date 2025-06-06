
import { supabase } from "@/lib/supabase/client";
import { logger } from "@/lib/logger";
import { calculateClientPortfolio, PortfolioData } from "./portfolioCalculationService";
import { getClientSharePercentage, getAgentCommissionPercentage } from "@/lib/calculations/carbon";

export interface PortfolioUpdateResult {
  success: boolean;
  updatedProposals: number;
  portfolioData: PortfolioData;
  error?: string;
}

/**
 * Update client share percentages for all proposals in a client's portfolio
 */
export async function updatePortfolioPercentages(clientId: string): Promise<PortfolioUpdateResult> {
  const portfolioLogger = logger.withContext({
    component: 'PortfolioUpdateService',
    method: 'updatePortfolioPercentages',
    clientId
  });

  try {
    portfolioLogger.info("Starting portfolio percentage update");

    // Calculate the client's total portfolio
    const portfolioData = await calculateClientPortfolio(clientId);
    
    if (portfolioData.totalKWp === 0) {
      portfolioLogger.warn("No portfolio data found for client");
      return {
        success: true,
        updatedProposals: 0,
        portfolioData
      };
    }

    // Calculate new percentages based on total portfolio
    const newClientSharePercentage = getClientSharePercentage(portfolioData.totalKWp);
    const newAgentCommissionPercentage = getAgentCommissionPercentage(portfolioData.totalKWp);

    portfolioLogger.info("Calculated new percentages", {
      totalKWp: portfolioData.totalKWp,
      clientShare: newClientSharePercentage,
      agentCommission: newAgentCommissionPercentage
    });

    // Update all proposals for this client
    const { data: updatedProposals, error } = await supabase
      .from('proposals')
      .update({
        client_share_percentage: newClientSharePercentage,
        agent_commission_percentage: newAgentCommissionPercentage
      })
      .or(`client_id.eq.${clientId},client_reference_id.eq.${clientId}`)
      .is('archived_at', null)
      .neq('status', 'rejected')
      .select('id, title');

    if (error) {
      portfolioLogger.error("Error updating proposals", { error: error.message });
      throw error;
    }

    const updatedCount = updatedProposals?.length || 0;
    portfolioLogger.info("Portfolio update completed", {
      updatedProposals: updatedCount,
      proposalIds: updatedProposals?.map(p => p.id)
    });

    // Clear any cached proposals data
    localStorage.removeItem('proposals_cache');

    return {
      success: true,
      updatedProposals: updatedCount,
      portfolioData
    };

  } catch (error) {
    portfolioLogger.error("Portfolio update failed", { 
      error: error instanceof Error ? error.message : String(error) 
    });
    
    return {
      success: false,
      updatedProposals: 0,
      portfolioData: { totalKWp: 0, projectCount: 0, clientId },
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}

/**
 * Update portfolio percentages for multiple clients
 */
export async function updateMultiplePortfoliosPercentages(clientIds: string[]): Promise<Record<string, PortfolioUpdateResult>> {
  const portfolioLogger = logger.withContext({
    component: 'PortfolioUpdateService',
    method: 'updateMultiplePortfoliosPercentages'
  });

  const results: Record<string, PortfolioUpdateResult> = {};

  // Process portfolios in parallel
  const updatePromises = clientIds.map(async (clientId) => {
    const result = await updatePortfolioPercentages(clientId);
    results[clientId] = result;
  });

  await Promise.all(updatePromises);

  portfolioLogger.info("Multiple portfolio updates completed", {
    clientCount: clientIds.length,
    successfulUpdates: Object.values(results).filter(r => r.success).length
  });

  return results;
}

/**
 * Validate and fix portfolio inconsistencies
 */
export async function validateAndFixPortfolioInconsistencies(): Promise<{
  checked: number;
  fixed: number;
  errors: string[];
}> {
  const portfolioLogger = logger.withContext({
    component: 'PortfolioUpdateService',
    method: 'validateAndFixPortfolioInconsistencies'
  });

  try {
    portfolioLogger.info("Starting portfolio consistency validation");

    // Get all unique client IDs from proposals
    const { data: clientIds, error: clientError } = await supabase
      .from('proposals')
      .select('client_id, client_reference_id')
      .is('archived_at', null)
      .neq('status', 'rejected');

    if (clientError) {
      throw clientError;
    }

    // Extract unique client IDs
    const uniqueClientIds = new Set<string>();
    clientIds?.forEach(row => {
      if (row.client_id) uniqueClientIds.add(row.client_id);
      if (row.client_reference_id) uniqueClientIds.add(row.client_reference_id);
    });

    const clientIdArray = Array.from(uniqueClientIds);
    portfolioLogger.info("Found clients to validate", { count: clientIdArray.length });

    let fixedCount = 0;
    const errors: string[] = [];

    // Process in batches to avoid overwhelming the system
    const batchSize = 10;
    for (let i = 0; i < clientIdArray.length; i += batchSize) {
      const batch = clientIdArray.slice(i, i + batchSize);
      
      const batchResults = await updateMultiplePortfoliosPercentages(batch);
      
      for (const [clientId, result] of Object.entries(batchResults)) {
        if (result.success && result.updatedProposals > 0) {
          fixedCount += result.updatedProposals;
        } else if (!result.success && result.error) {
          errors.push(`Client ${clientId}: ${result.error}`);
        }
      }
      
      // Small delay between batches
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    portfolioLogger.info("Portfolio validation completed", {
      checked: clientIdArray.length,
      fixed: fixedCount,
      errors: errors.length
    });

    return {
      checked: clientIdArray.length,
      fixed: fixedCount,
      errors
    };

  } catch (error) {
    portfolioLogger.error("Portfolio validation failed", { error });
    return {
      checked: 0,
      fixed: 0,
      errors: [error instanceof Error ? error.message : "Unknown error"]
    };
  }
}
