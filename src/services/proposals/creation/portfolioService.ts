
import { logger } from "@/lib/logger";

export async function updateClientPortfolio(selectedClientId?: string): Promise<void> {
  if (!selectedClientId) return;

  const proposalLogger = logger.withContext({
    component: 'PortfolioService',
    method: 'updateClientPortfolio'
  });

  try {
    const { updatePortfolioPercentages } = await import('../portfolioUpdateService');
    await updatePortfolioPercentages(selectedClientId);
    proposalLogger.info("Portfolio percentages updated after proposal creation");
  } catch (portfolioError) {
    proposalLogger.warn("Failed to update portfolio percentages", { 
      error: portfolioError instanceof Error ? portfolioError.message : String(portfolioError)
    });
    // Don't fail the proposal creation for this
  }
}
