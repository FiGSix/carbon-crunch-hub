
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";

export interface PortfolioData {
  totalKWp: number;
  projectCount: number;
  clientId: string;
}

/**
 * Calculate the total portfolio size for a client across all their projects
 */
export async function calculateClientPortfolio(clientId: string): Promise<PortfolioData> {
  const portfolioLogger = logger.withContext({
    component: 'PortfolioCalculationService',
    method: 'calculateClientPortfolio',
    clientId
  });

  try {
    // Query all non-archived proposals for this client
    const { data: proposals, error } = await supabase
      .from('proposals')
      .select('id, project_info, client_id, client_reference_id')
      .or(`client_id.eq.${clientId},client_reference_id.eq.${clientId}`)
      .is('archived_at', null)
      .neq('status', 'rejected');

    if (error) {
      portfolioLogger.error("Error fetching client proposals", { error: error.message });
      return { totalKWp: 0, projectCount: 0, clientId };
    }

    if (!proposals || proposals.length === 0) {
      portfolioLogger.info("No proposals found for client", { clientId });
      return { totalKWp: 0, projectCount: 0, clientId };
    }

    let totalKWp = 0;
    let validProjectCount = 0;

    // Sum up the kWp from all projects
    proposals.forEach((proposal) => {
      try {
        const projectInfo = proposal.project_info as any;
        if (projectInfo && projectInfo.size) {
          const sizeKWp = parseFloat(String(projectInfo.size));
          if (!isNaN(sizeKWp) && sizeKWp > 0) {
            totalKWp += sizeKWp;
            validProjectCount++;
          }
        }
      } catch (parseError) {
        portfolioLogger.warn("Error parsing project size", { 
          proposalId: proposal.id, 
          error: parseError 
        });
      }
    });

    portfolioLogger.info("Portfolio calculation complete", {
      clientId,
      totalKWp,
      projectCount: validProjectCount,
      totalProposals: proposals.length
    });

    return {
      totalKWp,
      projectCount: validProjectCount,
      clientId
    };

  } catch (error) {
    portfolioLogger.error("Unexpected error calculating portfolio", { 
      error: error instanceof Error ? error.message : String(error) 
    });
    
    return { totalKWp: 0, projectCount: 0, clientId };
  }
}

/**
 * Get portfolio data for multiple clients
 */
export async function calculateMultipleClientPortfolios(clientIds: string[]): Promise<Record<string, PortfolioData>> {
  const portfolioLogger = logger.withContext({
    component: 'PortfolioCalculationService',
    method: 'calculateMultipleClientPortfolios'
  });

  const portfolios: Record<string, PortfolioData> = {};

  // Calculate portfolios in parallel
  const portfolioPromises = clientIds.map(async (clientId) => {
    const portfolio = await calculateClientPortfolio(clientId);
    portfolios[clientId] = portfolio;
  });

  await Promise.all(portfolioPromises);

  portfolioLogger.info("Multiple portfolio calculation complete", {
    clientCount: clientIds.length,
    portfoliosCalculated: Object.keys(portfolios).length
  });

  return portfolios;
}
