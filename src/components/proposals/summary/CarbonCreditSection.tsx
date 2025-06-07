
import React, { useState, useEffect, useMemo } from "react";
import { 
  normalizeToKWp
} from "@/lib/calculations/carbon";
import { calculateClientSpecificRevenue } from "@/lib/calculations/carbon/clientPricing";
import { dynamicCarbonPricingService } from "@/lib/calculations/carbon/dynamicPricing";
import { Skeleton } from "@/components/ui/skeleton";
import { calculateClientPortfolio, PortfolioData } from "@/services/proposals/portfolioCalculationService";
import { logger } from "@/lib/logger";
import { CarbonCreditSummary } from "./carbon/CarbonCreditSummary";
import { PortfolioInfo } from "./carbon/PortfolioInfo";
import { CarbonCreditTable } from "./carbon/CarbonCreditTable";
import { 
  calculateTotalMWhGenerated, 
  calculateTotalCarbonCredits,
  calculateYearlyCarbonCredits
} from "./carbon/carbonCalculations";

interface CarbonCreditSectionProps {
  systemSize: string;
  commissionDate?: string;
  selectedClientId?: string | null;
}

export function CarbonCreditSection({ systemSize, commissionDate, selectedClientId }: CarbonCreditSectionProps) {
  const systemSizeKWp = normalizeToKWp(systemSize);
  const [portfolioData, setPortfolioData] = useState<PortfolioData | null>(null);
  const [marketRevenue, setMarketRevenue] = useState<Record<string, number>>({});
  const [clientSpecificRevenue, setClientSpecificRevenue] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  
  // Create logger with useMemo to prevent infinite loops
  const carbonLogger = useMemo(() => 
    logger.withContext({
      component: 'CarbonCreditSection',
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

  // Load both market and client-specific revenue data
  useEffect(() => {
    const loadRevenue = async () => {
      if (!portfolioData) return;

      try {
        setLoading(true);
        carbonLogger.info("Loading carbon prices for revenue calculation");
        
        const carbonPrices = await dynamicCarbonPricingService.getCarbonPrices();
        
        // Calculate both market and client-specific revenue
        const calculatedMarketRevenue: Record<string, number> = {};
        const calculatedClientSpecificRevenue: Record<string, number> = {};
        
        for (const [year, price] of Object.entries(carbonPrices)) {
          const yearNum = parseInt(year);
          const yearlyCarbonCredits = calculateYearlyCarbonCredits(systemSizeKWp, yearNum, commissionDate);
          
          // Market revenue (standard pricing)
          calculatedMarketRevenue[year] = Math.round(yearlyCarbonCredits * price);
          
          // Client-specific revenue (portfolio-based pricing)
          calculatedClientSpecificRevenue[year] = await calculateClientSpecificRevenue(
            year, 
            yearlyCarbonCredits, 
            portfolioData.totalKWp
          );
        }
        
        setMarketRevenue(calculatedMarketRevenue);
        setClientSpecificRevenue(calculatedClientSpecificRevenue);
        
        carbonLogger.info("Revenue calculation completed with client-specific pricing", { 
          years: Object.keys(calculatedMarketRevenue),
          totalMarketRevenue: Object.values(calculatedMarketRevenue).reduce((sum, val) => sum + val, 0),
          totalClientSpecificRevenue: Object.values(calculatedClientSpecificRevenue).reduce((sum, val) => sum + val, 0),
          portfolioSize: portfolioData.totalKWp
        });
        
      } catch (error) {
        carbonLogger.error("Error loading carbon prices for client-specific revenue", { error });
        // Fallback to empty revenue objects
        setMarketRevenue({});
        setClientSpecificRevenue({});
      } finally {
        setLoading(false);
      }
    };

    if (portfolioData) {
      loadRevenue();
    }
  }, [systemSize, commissionDate, systemSizeKWp, portfolioData, carbonLogger]);
  
  // Use client-specific revenue for display (this is what the client actually gets)
  const displayRevenue = clientSpecificRevenue;

  // Calculate totals using helper functions
  const totalMWhGenerated = calculateTotalMWhGenerated(systemSizeKWp, displayRevenue, commissionDate);
  const totalCarbonCredits = calculateTotalCarbonCredits(systemSizeKWp, displayRevenue, commissionDate);
  const totalClientSpecificRevenue = Object.values(clientSpecificRevenue).reduce((sum, val) => sum + val, 0);

  if (loading) {
    return (
      <div>
        <h3 className="text-lg font-semibold mb-3 text-carbon-gray-900">Carbon Credit Projection</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-lg font-semibold mb-3 text-carbon-gray-900">Carbon Credit Projection</h3>
      
      <CarbonCreditSummary systemSize={systemSize} />
      
      <PortfolioInfo portfolioData={portfolioData} />
      
      <h4 className="font-medium text-carbon-gray-700 mb-2">Client Revenue by Year</h4>
      
      {/* Show transparency info about pricing */}
      {portfolioData && portfolioData.projectCount > 1 && (
        <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-sm text-blue-700">
            <strong>Portfolio-based pricing:</strong> Revenue calculated using your client's portfolio size of {portfolioData.totalKWp.toLocaleString()} kWp. 
            Client receives {((Object.values(clientSpecificRevenue).reduce((sum, val) => sum + val, 0) / Object.values(marketRevenue).reduce((sum, val) => sum + val, 0)) * 100).toFixed(1)}% of market value.
          </p>
        </div>
      )}
      
      <CarbonCreditTable 
        revenue={displayRevenue}
        systemSizeKWp={systemSizeKWp}
        commissionDate={commissionDate}
        portfolioSize={portfolioData?.totalKWp || systemSizeKWp}
        totalMWhGenerated={totalMWhGenerated}
        totalCarbonCredits={totalCarbonCredits}
        totalClientSpecificRevenue={totalClientSpecificRevenue}
      />
      
      {commissionDate && (
        <p className="text-xs text-carbon-gray-500 mt-2">
          * Values for commissioning year are pro-rated based on the commission date
        </p>
      )}
      {portfolioData && portfolioData.projectCount > 1 && (
        <p className="text-xs text-carbon-gray-500 mt-1">
          * Revenue reflects portfolio-based client share percentage ({((Object.values(clientSpecificRevenue).reduce((sum, val) => sum + val, 0) / Object.values(marketRevenue).reduce((sum, val) => sum + val, 0)) * 100).toFixed(1)}% of market rate)
        </p>
      )}
    </div>
  );
}
