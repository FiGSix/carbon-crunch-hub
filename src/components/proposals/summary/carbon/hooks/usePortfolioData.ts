
import { useState, useEffect, useMemo } from "react";
import { calculateClientPortfolio, PortfolioData } from "@/services/proposals/portfolioCalculationService";
import { logger } from "@/lib/logger";

interface UsePortfolioDataProps {
  selectedClientId?: string | null;
  systemSize: string;
}

export function usePortfolioData({ selectedClientId, systemSize }: UsePortfolioDataProps) {
  const [portfolioData, setPortfolioData] = useState<PortfolioData | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Create logger with useMemo to prevent infinite loops
  const carbonLogger = useMemo(() => 
    logger.withContext({
      component: 'usePortfolioData',
      feature: 'client-specific-pricing'
    }), []
  );

  // Load portfolio data for client-specific pricing
  useEffect(() => {
    const loadPortfolioData = async () => {
      if (!selectedClientId) {
        // If no client selected, use current project size only
        const currentProjectSize = parseFloat(systemSize) || 0;
        setPortfolioData({
          totalKWp: currentProjectSize,
          projectCount: 1,
          clientId: 'current'
        });
        return;
      }

      setLoading(true);
      try {
        carbonLogger.info("Loading portfolio data for client-specific pricing", { selectedClientId });
        
        const portfolio = await calculateClientPortfolio(selectedClientId);
        
        // Add current project size to the total
        const currentProjectSize = parseFloat(systemSize) || 0;
        const totalPortfolioSize = portfolio.totalKWp + currentProjectSize;
        
        setPortfolioData({
          ...portfolio,
          totalKWp: totalPortfolioSize,
          projectCount: portfolio.projectCount + 1
        });
        
        carbonLogger.info("Portfolio data loaded for client-specific pricing", { 
          existingKWp: portfolio.totalKWp,
          currentProjectKWp: currentProjectSize,
          totalKWp: totalPortfolioSize
        });
        
      } catch (error) {
        carbonLogger.error("Error loading portfolio data for client-specific pricing", { error });
        // Fallback to current project only
        const currentProjectSize = parseFloat(systemSize) || 0;
        setPortfolioData({
          totalKWp: currentProjectSize,
          projectCount: 1,
          clientId: selectedClientId
        });
      } finally {
        setLoading(false);
      }
    };

    loadPortfolioData();
  }, [selectedClientId, systemSize, carbonLogger]);

  return { portfolioData, loading };
}
