
import React, { useState, useEffect } from "react";
import { 
  getClientSharePercentage,
  getAgentCommissionPercentage
} from "@/lib/calculations/carbon";
import { useAuth } from "@/contexts/auth";
import { calculateClientPortfolio, PortfolioData } from "@/services/proposals/portfolioCalculationService";
import { Skeleton } from "@/components/ui/skeleton";
import { logger } from "@/lib/logger";

interface RevenueDistributionSectionProps {
  systemSize: string;
  selectedClientId?: string | null;
}

export function RevenueDistributionSection({ systemSize, selectedClientId }: RevenueDistributionSectionProps) {
  const { profile } = useAuth();
  const isClient = profile?.role === 'client';
  
  const [portfolioData, setPortfolioData] = useState<PortfolioData | null>(null);
  const [loading, setLoading] = useState(false);
  
  const revenueLogger = logger.withContext({
    component: 'RevenueDistributionSection',
    feature: 'portfolio-calculation'
  });

  // Calculate portfolio when we have a client ID
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
        revenueLogger.info("Loading portfolio data for client", { selectedClientId });
        
        const portfolio = await calculateClientPortfolio(selectedClientId);
        
        // Add current project size to the total
        const currentProjectSize = parseFloat(systemSize) || 0;
        const totalPortfolioSize = portfolio.totalKWp + currentProjectSize;
        
        setPortfolioData({
          ...portfolio,
          totalKWp: totalPortfolioSize,
          projectCount: portfolio.projectCount + 1
        });
        
        revenueLogger.info("Portfolio data loaded", { 
          existingKWp: portfolio.totalKWp,
          currentProjectKWp: currentProjectSize,
          totalKWp: totalPortfolioSize
        });
        
      } catch (error) {
        revenueLogger.error("Error loading portfolio data", { error });
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
  }, [selectedClientId, systemSize, revenueLogger]);

  if (loading) {
    return (
      <div>
        <h3 className="text-lg font-semibold mb-3 text-carbon-gray-900">Revenue Distribution</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
      </div>
    );
  }

  // Use portfolio size for calculations, fallback to current project size
  const portfolioSize = portfolioData?.totalKWp || parseFloat(systemSize) || 0;
  const clientSharePercentage = getClientSharePercentage(portfolioSize);
  const agentCommissionPercentage = getAgentCommissionPercentage(portfolioSize);
  const crunchCarbonSharePercentage = 100 - clientSharePercentage - agentCommissionPercentage;

  return (
    <div>
      <h3 className="text-lg font-semibold mb-3 text-carbon-gray-900">Revenue Distribution</h3>
      
      {portfolioData && portfolioData.projectCount > 1 && (
        <div className="mb-4 p-3 bg-carbon-blue-50 rounded-lg border border-carbon-blue-200">
          <p className="text-sm text-carbon-blue-700">
            <strong>Portfolio-based calculation:</strong> Total portfolio size of {portfolioData.totalKWp.toLocaleString()} kWp 
            across {portfolioData.projectCount} projects (including this one)
          </p>
        </div>
      )}
      
      <div className={`grid grid-cols-1 ${isClient ? 'md:grid-cols-1' : 'md:grid-cols-3'} gap-4`}>
        <div className="p-4 bg-carbon-green-50 rounded-lg border border-carbon-green-200">
          <p className="text-sm text-carbon-gray-500">Client Share</p>
          <p className="text-xl font-bold text-carbon-green-600">{clientSharePercentage}%</p>
          <p className="text-xs text-carbon-gray-500 mt-1">
            Based on {portfolioSize.toLocaleString()} kWp portfolio
          </p>
        </div>
        
        {!isClient && (
          <>
            <div className="p-4 bg-carbon-blue-50 rounded-lg border border-carbon-blue-200">
              <p className="text-sm text-carbon-gray-500">Agent Commission</p>
              <p className="text-xl font-bold text-carbon-blue-600">{agentCommissionPercentage}%</p>
              <p className="text-xs text-carbon-gray-500 mt-1">
                Based on {portfolioSize.toLocaleString()} kWp portfolio
              </p>
            </div>
            <div className="p-4 bg-carbon-gray-50 rounded-lg border border-carbon-gray-200">
              <p className="text-sm text-carbon-gray-500">Crunch Carbon Share</p>
              <p className="text-xl font-bold text-carbon-gray-900">
                {crunchCarbonSharePercentage.toFixed(1)}%
              </p>
              <p className="text-xs text-carbon-gray-500 mt-1">Platform fee</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
