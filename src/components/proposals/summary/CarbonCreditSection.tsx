
import React, { useState, useEffect, useMemo } from "react";
import { 
  calculateRevenueSync,
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
  const [revenue, setRevenue] = useState<Record<string, number>>({});
  const [totalClientSpecificRevenue, setTotalClientSpecificRevenue] = useState(0);
  const [loading, setLoading] = useState(false);
  
  // Create logger with useMemo to prevent infinite loops
  const carbonLogger = useMemo(() => 
    logger.withContext({
      component: 'CarbonCreditSection',
      feature: 'dynamic-pricing'
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
        carbonLogger.info("Loading portfolio data for carbon pricing", { selectedClientId });
        
        const portfolio = await calculateClientPortfolio(selectedClientId);
        
        // Add current project size to the total
        const currentProjectSize = parseFloat(systemSize) || 0;
        const totalPortfolioSize = portfolio.totalKWp + currentProjectSize;
        
        setPortfolioData({
          ...portfolio,
          totalKWp: totalPortfolioSize,
          projectCount: portfolio.projectCount + 1
        });
        
        carbonLogger.info("Portfolio data loaded for carbon pricing", { 
          existingKWp: portfolio.totalKWp,
          currentProjectKWp: currentProjectSize,
          totalKWp: totalPortfolioSize
        });
        
      } catch (error) {
        carbonLogger.error("Error loading portfolio data for carbon pricing", { error });
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
  }, [selectedClientId, systemSize]);

  // Load dynamic revenue data and calculate client-specific revenue
  useEffect(() => {
    const loadRevenue = async () => {
      try {
        setLoading(true);
        carbonLogger.info("Loading dynamic carbon prices for revenue calculation");
        
        const carbonPrices = await dynamicCarbonPricingService.getCarbonPrices();
        
        // Calculate revenue based on dynamic prices
        const calculatedRevenue: Record<string, number> = {};
        let clientSpecificTotal = 0;
        
        for (const [year, price] of Object.entries(carbonPrices)) {
          const yearNum = parseInt(year);
          const yearlyCarbonCredits = calculateYearlyCarbonCredits(systemSizeKWp, yearNum, commissionDate);
          calculatedRevenue[year] = Math.round(yearlyCarbonCredits * price);
          
          // Calculate client-specific revenue for this year
          if (portfolioData) {
            const clientRevenue = await calculateClientSpecificRevenue(year, yearlyCarbonCredits, portfolioData.totalKWp);
            clientSpecificTotal += clientRevenue;
          }
        }
        
        setRevenue(calculatedRevenue);
        setTotalClientSpecificRevenue(clientSpecificTotal);
        
        carbonLogger.info("Dynamic revenue calculation completed", { 
          years: Object.keys(calculatedRevenue),
          totalRevenue: Object.values(calculatedRevenue).reduce((sum, val) => sum + val, 0),
          totalClientSpecificRevenue: clientSpecificTotal
        });
        
      } catch (error) {
        carbonLogger.error("Error loading dynamic carbon prices", { error });
        // Fallback to empty revenue object
        setRevenue({});
        setTotalClientSpecificRevenue(0);
      } finally {
        setLoading(false);
      }
    };

    if (portfolioData) {
      loadRevenue();
    }
  }, [systemSize, commissionDate, systemSizeKWp, portfolioData, carbonLogger]);
  
  // Use portfolio size for calculations, fallback to current project size
  const portfolioSize = portfolioData?.totalKWp || parseFloat(systemSize) || 0;

  // Calculate totals using helper functions
  const totalMWhGenerated = calculateTotalMWhGenerated(systemSizeKWp, revenue, commissionDate);
  const totalCarbonCredits = calculateTotalCarbonCredits(systemSizeKWp, revenue, commissionDate);

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
      
      <h4 className="font-medium text-carbon-gray-700 mb-2">Projected Revenue by Year</h4>
      
      <CarbonCreditTable 
        revenue={revenue}
        systemSizeKWp={systemSizeKWp}
        commissionDate={commissionDate}
        portfolioSize={portfolioSize}
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
          * Client prices reflect your portfolio-based share percentage
        </p>
      )}
    </div>
  );
}
