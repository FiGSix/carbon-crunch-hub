
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";

export interface AgentPortfolioData {
  totalKWp: number;
  projectCount: number;
  agentId: string;
}

/**
 * Calculate total portfolio size for an agent across all their clients
 */
export async function calculateAgentPortfolio(agentId: string): Promise<AgentPortfolioData> {
  const agentLogger = logger.withContext({
    component: 'AgentPortfolioService',
    method: 'calculateAgentPortfolio',
    agentId
  });

  try {
    agentLogger.info("Calculating agent portfolio size");

    // Get all proposals for this agent that are not archived/deleted/rejected
    const { data: proposals, error } = await supabase
      .from('proposals')
      .select('system_size_kwp, project_info')
      .eq('agent_id', agentId)
      .is('archived_at', null)
      .is('deleted_at', null)
      .neq('status', 'rejected');

    if (error) {
      agentLogger.error("Error fetching agent proposals", { error });
      throw error;
    }

    let totalKWp = 0;
    let projectCount = 0;

    for (const proposal of proposals || []) {
      // Use system_size_kwp if available, otherwise extract from project_info
      let projectSize = proposal.system_size_kwp;
      
      if (!projectSize && proposal.project_info?.size) {
        try {
          projectSize = parseFloat(proposal.project_info.size);
        } catch (e) {
          agentLogger.warn("Could not parse project size", { 
            proposalId: proposal.id,
            projectInfoSize: proposal.project_info.size 
          });
          continue;
        }
      }

      if (projectSize && projectSize > 0) {
        totalKWp += projectSize;
        projectCount++;
      }
    }

    const portfolioData: AgentPortfolioData = {
      totalKWp,
      projectCount,
      agentId
    };

    agentLogger.info("Agent portfolio calculated", portfolioData);
    return portfolioData;

  } catch (error) {
    agentLogger.error("Error calculating agent portfolio", { error });
    throw error;
  }
}
