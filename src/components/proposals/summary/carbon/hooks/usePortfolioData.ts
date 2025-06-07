
import { useState, useEffect, useMemo } from "react";
import { calculateClientPortfolio, PortfolioData } from "@/services/proposals/portfolioCalculationService";
import { logger } from "@/lib/logger";

interface UsePortfolioDataProps {
  selectedClientId?: string | null;
  systemSize: string;
  proposalId?: string | null; // Add proposal ID to detect view vs create mode
}

export function usePortfolioData({ selectedClientId, systemSize, proposalId }: UsePortfolioDataProps) {
  const [portfolioData, setPortfolioData] = useState<PortfolioData | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Create logger with useMemo to prevent infinite loops
  const carbonLogger = useMemo(() => 
    logger.withContext({
      component: 'usePortfolioData',
      feature: 'client-specific-pricing'
    }), []
  );

  // Determine if we're viewing an existing proposal or creating a new one
  const isViewingExistingProposal = !!proposalId;

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
        carbonLogger.info("Loading portfolio data for client-specific pricing", { 
          selectedClientId, 
          isViewingExistingProposal 
        });
        
        const portfolio = await calculateClientPortfolio(selectedClientId);
        
        // Only add current project size when creating a new proposal
        // When viewing existing proposals, the portfolio already includes this project
        let totalPortfolioSize: number;
        let projectCount: number;
        
        if (isViewingExistingProposal) {
          // Viewing existing proposal - portfolio already includes this project
          totalPortfolioSize = portfolio.totalKWp;
          projectCount = portfolio.projectCount;
        } else {
          // Creating new proposal - add current project to existing portfolio
          const currentProjectSize = parseFloat(systemSize) || 0;
          totalPortfolioSize = portfolio.totalKWp + currentProjectSize;
          projectCount = portfolio.projectCount + 1;
        }
        
        setPortfolioData({
          ...portfolio,
          totalKWp: totalPortfolioSize,
          projectCount
        });
        
        carbonLogger.info("Portfolio data loaded for client-specific pricing", { 
          existingKWp: portfolio.totalKWp,
          currentProjectKWp: parseFloat(systemSize) || 0,
          totalKWp: totalPortfolioSize,
          isViewingExistingProposal,
          projectCount
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
  }, [selectedClientId, systemSize, proposalId, isViewingExistingProposal, carbonLogger]);

  return { portfolioData, loading };
}
