import { useState, useEffect, useMemo } from "react";
import { calculateAgentPortfolio, PortfolioData } from "@/services/proposals/portfolioService";
import { logger } from "@/lib/logger";
import { useAuth } from "@/contexts/auth";

interface UseOptimizedAgentPortfolioResult {
  portfolioData: PortfolioData | null;
  loading: boolean;
  error: string | null;
}

export function useOptimizedAgentPortfolio(): UseOptimizedAgentPortfolioResult {
  const { user, userRole } = useAuth();
  const [portfolioData, setPortfolioData] = useState<PortfolioData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Create logger with useMemo to prevent infinite loops
  const portfolioLogger = useMemo(() => 
    logger.withContext({
      component: 'useOptimizedAgentPortfolio',
      feature: 'agent-portfolio-optimization'
    }), []
  );

  // Only load for agents
  const shouldLoad = userRole === 'agent' && user?.id;

  useEffect(() => {
    if (!shouldLoad) {
      setPortfolioData(null);
      setLoading(false);
      setError(null);
      return;
    }

    let isCancelled = false;

    const loadPortfolioData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        portfolioLogger.info("Loading optimized agent portfolio data", { 
          agentId: user.id 
        });
        
        const result = await calculateAgentPortfolio(user.id);
        
        if (!isCancelled) {
          setPortfolioData(result);
          portfolioLogger.info("Optimized agent portfolio data loaded", result);
        }
        
      } catch (err) {
        if (!isCancelled) {
          const errorMessage = err instanceof Error ? err.message : 'Failed to load portfolio data';
          setError(errorMessage);
          portfolioLogger.error("Error loading optimized agent portfolio data", { error: err });
          
          // Fallback to empty portfolio
          setPortfolioData({
            totalKWp: 0,
            projectCount: 0,
            agentId: user.id
          });
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };

    loadPortfolioData();

    return () => {
      isCancelled = true;
    };
  }, [user?.id, shouldLoad, portfolioLogger]);

  return { portfolioData, loading, error };
}