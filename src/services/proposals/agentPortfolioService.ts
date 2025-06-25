
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";
import type { Database } from '@/integrations/supabase/types';

type ProposalRow = Database['public']['Tables']['proposals']['Row'];

export interface AgentPortfolioData {
  totalKWp: number;
  projectCount: number;
  agentId: string;
}

/**
 * Calculate agent portfolio size and project count
 */
export async function calculateAgentPortfolio(agentId: string): Promise<AgentPortfolioData> {
  const portfolioLogger = logger.withContext({
    component: 'AgentPortfolioService',
    feature: 'agent-portfolio'
  });

  try {
    portfolioLogger.info("Calculating agent portfolio", { agentId });

    const { data, error } = await supabase
      .from('proposals')
      .select('system_size_kwp')
      .eq('agent_id', agentId)
      .neq('status', 'rejected')
      .is('deleted_at', null)
      .is('archived_at', null);

    if (error) {
      portfolioLogger.error("Error fetching agent proposals", { error });
      throw error;
    }

    const totalKWp = (data || []).reduce((sum: number, proposal: ProposalRow) => {
      return sum + (proposal.system_size_kwp || 0);
    }, 0);

    const result = {
      totalKWp,
      projectCount: data?.length || 0,
      agentId
    };

    portfolioLogger.info("Agent portfolio calculated", result);
    return result;

  } catch (error) {
    portfolioLogger.error("Error calculating agent portfolio", { error, agentId });
    // Return fallback values
    return {
      totalKWp: 0,
      projectCount: 0,
      agentId
    };
  }
}
