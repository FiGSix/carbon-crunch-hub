
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";

export interface PortfolioData {
  totalKWp: number;
  projectCount: number;
  clientId: string;
}

/**
 * Calculate client portfolio size and project count
 */
export async function calculateClientPortfolio(clientId: string): Promise<PortfolioData> {
  const portfolioLogger = logger.withContext({
    component: 'PortfolioCalculationService',
    feature: 'client-portfolio'
  });

  try {
    portfolioLogger.info("Calculating client portfolio", { clientId });

    const { data: proposals, error } = await supabase
      .from('proposals')
      .select('system_size_kwp')
      .or(`client_id.eq.${clientId},client_reference_id.eq.${clientId}`)
      .neq('status', 'rejected')
      .is('deleted_at', null)
      .is('archived_at', null);

    if (error) {
      portfolioLogger.error("Error fetching client proposals", { error });
      throw error;
    }

    const totalKWp = (proposals || []).reduce((sum, proposal) => {
      return sum + (proposal.system_size_kwp || 0);
    }, 0);

    const result = {
      totalKWp,
      projectCount: proposals?.length || 0,
      clientId
    };

    portfolioLogger.info("Client portfolio calculated", result);
    return result;

  } catch (error) {
    portfolioLogger.error("Error calculating client portfolio", { error, clientId });
    // Return fallback values
    return {
      totalKWp: 0,
      projectCount: 0,
      clientId
    };
  }
}
