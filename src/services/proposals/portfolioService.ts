
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";
import type { Database } from '@/integrations/supabase/types';

type ProposalRow = Database['public']['Tables']['proposals']['Row'];

export interface PortfolioData {
  totalKWp: number;
  projectCount: number;
  clientId?: string;
  agentId?: string;
}

/**
 * Unified portfolio calculation service for both clients and agents
 */
export class PortfolioService {
  private static portfolioLogger = logger.withContext({
    component: 'PortfolioService',
    feature: 'portfolio-calculation'
  });

  /**
   * Calculate client portfolio size and project count
   */
  static async calculateClientPortfolio(clientId: string): Promise<PortfolioData> {
    try {
      this.portfolioLogger.info("Calculating client portfolio", { clientId });

      const { data, error } = await supabase
        .from('proposals')
        .select('system_size_kwp')
        .or(`client_id.eq.${clientId},client_reference_id.eq.${clientId}`)
        .neq('status', 'rejected')
        .is('deleted_at', null)
        .is('archived_at', null);

      if (error) {
        this.portfolioLogger.error("Error fetching client proposals", { error });
        throw error;
      }

      const totalKWp = (data || []).reduce((sum: number, proposal: ProposalRow) => {
        return sum + (proposal.system_size_kwp || 0);
      }, 0);

      const result = {
        totalKWp,
        projectCount: data?.length || 0,
        clientId
      };

      this.portfolioLogger.info("Client portfolio calculated", result);
      return result;

    } catch (error) {
      this.portfolioLogger.error("Error calculating client portfolio", { error, clientId });
      return {
        totalKWp: 0,
        projectCount: 0,
        clientId
      };
    }
  }

  /**
   * Calculate agent portfolio size and project count
   */
  static async calculateAgentPortfolio(agentId: string): Promise<PortfolioData> {
    try {
      this.portfolioLogger.info("Calculating agent portfolio", { agentId });

      const { data, error } = await supabase
        .from('proposals')
        .select('system_size_kwp')
        .eq('agent_id', agentId)
        .neq('status', 'rejected')
        .is('deleted_at', null)
        .is('archived_at', null);

      if (error) {
        this.portfolioLogger.error("Error fetching agent proposals", { error });
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

      this.portfolioLogger.info("Agent portfolio calculated", result);
      return result;

    } catch (error) {
      this.portfolioLogger.error("Error calculating agent portfolio", { error, agentId });
      return {
        totalKWp: 0,
        projectCount: 0,
        agentId
      };
    }
  }
}

// Export legacy functions for backward compatibility
export const calculateClientPortfolio = PortfolioService.calculateClientPortfolio;
export const calculateAgentPortfolio = PortfolioService.calculateAgentPortfolio;
