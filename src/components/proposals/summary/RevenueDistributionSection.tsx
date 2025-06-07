
import React, { useState, useEffect, useMemo } from "react";
import { 
  getClientSharePercentage,
  getAgentCommissionPercentage
} from "@/lib/calculations/carbon";
import { useAuth } from "@/contexts/auth";
import { calculateClientPortfolio, PortfolioData } from "@/services/proposals/portfolioCalculationService";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { RefreshCw, Info } from "lucide-react";
import { usePortfolioUpdates } from "@/hooks/proposals/usePortfolioUpdates";
import { logger } from "@/lib/logger";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface RevenueDistributionSectionProps {
  systemSize: string;
  selectedClientId?: string | null;
}

export function RevenueDistributionSection({ systemSize, selectedClientId }: RevenueDistributionSectionProps) {
  const { profile } = useAuth();
  const isClient = profile?.role === 'client';
  
  const [portfolioData, setPortfolioData] = useState<PortfolioData | null>(null);
  const [loading, setLoading] = useState(false);
  const { updateClientPortfolio, loading: updateLoading } = usePortfolioUpdates();
  
  // Create logger with useMemo to prevent infinite loops
  const revenueLogger = useMemo(() => 
    logger.withContext({
      component: 'RevenueDistributionSection',
      feature: 'portfolio-calculation'
    }), []
  );

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
        revenueLogger.info("Loading portfolio data for revenue distribution", { selectedClientId });
        
        const portfolio = await calculateClientPortfolio(selectedClientId);
        
        // Add current project size to the total
        const currentProjectSize = parseFloat(systemSize) || 0;
        const totalPortfolioSize = portfolio.totalKWp + currentProjectSize;
        
        setPortfolioData({
          ...portfolio,
          totalKWp: totalPortfolioSize,
          projectCount: portfolio.projectCount + 1
        });
        
        revenueLogger.info("Portfolio data loaded for revenue distribution", { 
          existingKWp: portfolio.totalKWp,
          currentProjectKWp: currentProjectSize,
          totalKWp: totalPortfolioSize
        });
        
      } catch (error) {
        revenueLogger.error("Error loading portfolio data for revenue distribution", { error });
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

  const handleUpdatePortfolio = async () => {
    if (selectedClientId) {
      await updateClientPortfolio(selectedClientId);
      // Reload portfolio data after update
      const portfolio = await calculateClientPortfolio(selectedClientId);
      const currentProjectSize = parseFloat(systemSize) || 0;
      setPortfolioData({
        ...portfolio,
        totalKWp: portfolio.totalKWp + currentProjectSize,
        projectCount: portfolio.projectCount + 1
      });
    }
  };

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
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-carbon-gray-900">Revenue Distribution</h3>
        {selectedClientId && !isClient && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleUpdatePortfolio}
            disabled={updateLoading}
            className="ml-2"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${updateLoading ? 'animate-spin' : ''}`} />
            Update Portfolio
          </Button>
        )}
      </div>
      
      {portfolioData && portfolioData.projectCount > 1 && (
        <Alert className="mb-4">
          <Info className="h-4 w-4" />
          <AlertDescription>
            <strong>Portfolio-based calculation:</strong> Revenue distribution based on total portfolio size of {portfolioData.totalKWp.toLocaleString()} kWp 
            across {portfolioData.projectCount} projects (including this one). Larger portfolios receive higher client share percentages.
          </AlertDescription>
        </Alert>
      )}
      
      <div className={`grid grid-cols-1 ${isClient ? 'md:grid-cols-1' : 'md:grid-cols-3'} gap-4`}>
        <div className="p-4 bg-carbon-green-50 rounded-lg border border-carbon-green-200">
          <p className="text-sm text-carbon-gray-500">Client Share</p>
          <p className="text-xl font-bold text-carbon-green-600">{clientSharePercentage}%</p>
          <p className="text-xs text-carbon-gray-500 mt-1">
            Based on {portfolioSize.toLocaleString()} kWp portfolio
          </p>
          {portfolioData && portfolioData.projectCount > 1 && (
            <p className="text-xs text-carbon-green-600 mt-1">
              Portfolio bonus applied
            </p>
          )}
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
