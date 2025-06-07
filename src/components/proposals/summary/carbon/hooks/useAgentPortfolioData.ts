
import { useState, useEffect, useMemo } from "react";
import { calculateAgentPortfolio, AgentPortfolioData } from "@/services/proposals/agentPortfolioService";
import { logger } from "@/lib/logger";
import { useAuth } from "@/contexts/auth";

interface UseAgentPortfolioDataProps {
  systemSize: string;
  proposalId?: string | null;
}

export function useAgentPortfolioData({ systemSize, proposalId }: UseAgentPortfolioDataProps) {
  const { user } = useAuth();
  const [agentPortfolioData, setAgentPortfolioData] = useState<AgentPortfolioData | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Create logger with useMemo to prevent infinite loops
  const agentLogger = useMemo(() => 
    logger.withContext({
      component: 'useAgentPortfolioData',
      feature: 'agent-commission-calculation'
    }), []
  );

  // Determine if we're viewing an existing proposal or creating a new one
  const isViewingExistingProposal = !!proposalId;

  // Load agent portfolio data for commission calculations
  useEffect(() => {
    const loadAgentPortfolioData = async () => {
      if (!user?.id) {
        agentLogger.warn("No user ID available for agent portfolio calculation");
        return;
      }

      setLoading(true);
      try {
        agentLogger.info("Loading agent portfolio data for commission calculation", { 
          agentId: user.id,
          isViewingExistingProposal 
        });
        
        const agentPortfolio = await calculateAgentPortfolio(user.id);
        
        // Only add current project size when creating a new proposal
        // When viewing existing proposals, the portfolio already includes this project
        let totalPortfolioSize: number;
        let projectCount: number;
        
        if (isViewingExistingProposal) {
          // Viewing existing proposal - portfolio already includes this project
          totalPortfolioSize = agentPortfolio.totalKWp;
          projectCount = agentPortfolio.projectCount;
        } else {
          // Creating new proposal - add current project to existing portfolio
          const currentProjectSize = parseFloat(systemSize) || 0;
          totalPortfolioSize = agentPortfolio.totalKWp + currentProjectSize;
          projectCount = agentPortfolio.projectCount + 1;
        }
        
        setAgentPortfolioData({
          ...agentPortfolio,
          totalKWp: totalPortfolioSize,
          projectCount
        });
        
        agentLogger.info("Agent portfolio data loaded for commission calculation", { 
          existingKWp: agentPortfolio.totalKWp,
          currentProjectKWp: parseFloat(systemSize) || 0,
          totalKWp: totalPortfolioSize,
          isViewingExistingProposal,
          projectCount
        });
        
      } catch (error) {
        agentLogger.error("Error loading agent portfolio data for commission calculation", { error });
        // Fallback to current project only
        const currentProjectSize = parseFloat(systemSize) || 0;
        setAgentPortfolioData({
          totalKWp: currentProjectSize,
          projectCount: 1,
          agentId: user.id
        });
      } finally {
        setLoading(false);
      }
    };

    loadAgentPortfolioData();
  }, [user?.id, systemSize, proposalId, isViewingExistingProposal, agentLogger]);

  return { agentPortfolioData, loading };
}
