
import { useState, useEffect, useMemo } from "react";
import { normalizeToKWp } from "@/lib/calculations/carbon";
import { calculateClientSpecificRevenue } from "@/lib/calculations/carbon/clientPricing";
import { dynamicCarbonPricingService } from "@/lib/calculations/carbon/dynamicPricing";
import { calculateYearlyCarbonCredits } from "../carbonCalculations";
import { PortfolioData } from "@/services/proposals/portfolioCalculationService";
import { logger } from "@/lib/logger";

interface UseRevenueCalculationsProps {
  systemSize: string;
  commissionDate?: string;
  portfolioData: PortfolioData | null;
}

export function useRevenueCalculations({ systemSize, commissionDate, portfolioData }: UseRevenueCalculationsProps) {
  const systemSizeKWp = normalizeToKWp(systemSize);
  const [marketRevenue, setMarketRevenue] = useState<Record<string, number>>({});
  const [clientSpecificRevenue, setClientSpecificRevenue] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  
  // Create logger with useMemo to prevent infinite loops
  const carbonLogger = useMemo(() => 
    logger.withContext({
      component: 'useRevenueCalculations',
      feature: 'client-specific-pricing'
    }), []
  );

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

  return {
    marketRevenue,
    clientSpecificRevenue,
    loading,
    systemSizeKWp
  };
}
