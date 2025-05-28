import React, { useState, useEffect, useMemo } from "react";
import { 
  calculateAnnualEnergy, 
  calculateCarbonCredits, 
  calculateRevenue,
  getFormattedCarbonPriceForYear,
  getFormattedClientSpecificCarbonPrice,
  calculateClientSpecificRevenue,
  normalizeToKWp,
  EMISSION_FACTOR
} from "@/lib/calculations/carbon";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { calculateClientPortfolio, PortfolioData } from "@/services/proposals/portfolioCalculationService";
import { logger } from "@/lib/logger";

interface CarbonCreditSectionProps {
  systemSize: string;
  commissionDate?: string;
  selectedClientId?: string | null;
}

/**
 * Helper function to calculate pro-rated energy generation for a specific year
 * Updated to handle January 1st commissioning as full years
 */
function calculateYearlyEnergy(systemSizeKWp: number, year: number, commissionDate?: string): number {
  const fullYearEnergy = calculateAnnualEnergy(systemSizeKWp);
  
  if (!commissionDate) {
    return fullYearEnergy;
  }
  
  const commissionDateTime = new Date(commissionDate);
  const commissionYear = commissionDateTime.getFullYear();
  
  // Apply pro-rata logic for commission year
  if (year === commissionYear) {
    // Check if commissioning happens at the very beginning of the year (January 1st)
    const isJanuary1st = commissionDateTime.getMonth() === 0 && commissionDateTime.getDate() === 1;
    
    if (isJanuary1st) {
      // If commissioned on January 1st, treat as full year
      return fullYearEnergy;
    }
    
    // For other dates, apply pro-rata logic
    const yearStart = new Date(year, 0, 1);
    const yearEnd = new Date(year, 11, 31);
    const remainingDays = Math.max(0, Math.floor((yearEnd.getTime() - commissionDateTime.getTime()) / (1000 * 60 * 60 * 24)) + 1);
    const totalDaysInYear = Math.floor((yearEnd.getTime() - yearStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    
    return fullYearEnergy * (remainingDays / totalDaysInYear);
  }
  
  return fullYearEnergy;
}

/**
 * Helper function to calculate pro-rated carbon credits for a specific year using standardized emission factor
 */
function calculateYearlyCarbonCredits(systemSizeKWp: number, year: number, commissionDate?: string): number {
  const yearlyEnergy = calculateYearlyEnergy(systemSizeKWp, year, commissionDate);
  // Convert kWh to MWh and then to tCO₂ using the standardized emission factor (0.928 tCO₂/MWh)
  return (yearlyEnergy / 1000) * EMISSION_FACTOR;
}

export function CarbonCreditSection({ systemSize, commissionDate, selectedClientId }: CarbonCreditSectionProps) {
  const systemSizeKWp = normalizeToKWp(systemSize);
  const [portfolioData, setPortfolioData] = useState<PortfolioData | null>(null);
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
  }, [selectedClientId, systemSize]); // Removed carbonLogger from dependencies to prevent infinite loop

  // Calculate revenue with commission date for pro-rata logic
  const revenue = calculateRevenue(systemSize, commissionDate);
  
  // Use portfolio size for calculations, fallback to current project size
  const portfolioSize = portfolioData?.totalKWp || parseFloat(systemSize) || 0;

  // Calculate totals
  const totalMWhGenerated = Object.keys(revenue).reduce((total, year) => {
    const yearlyEnergy = calculateYearlyEnergy(systemSizeKWp, parseInt(year), commissionDate);
    return total + (yearlyEnergy / 1000); // Convert kWh to MWh
  }, 0);

  const totalCarbonCredits = Object.keys(revenue).reduce((total, year) => {
    const yearlyCarbonCredits = calculateYearlyCarbonCredits(systemSizeKWp, parseInt(year), commissionDate);
    return total + yearlyCarbonCredits;
  }, 0);

  // Calculate client-specific total revenue
  const totalClientSpecificRevenue = Object.keys(revenue).reduce((total, year) => {
    const yearlyCarbonCredits = calculateYearlyCarbonCredits(systemSizeKWp, parseInt(year), commissionDate);
    const clientRevenue = calculateClientSpecificRevenue(year, yearlyCarbonCredits, portfolioSize);
    return total + clientRevenue;
  }, 0);

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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-sm text-carbon-gray-500">Estimated Annual Energy</p>
          <p className="font-medium">{calculateAnnualEnergy(systemSize).toLocaleString()} kWh</p>
        </div>
        <div>
          <p className="text-sm text-carbon-gray-500">Estimated Annual Carbon Credits</p>
          <p className="font-medium">{calculateCarbonCredits(systemSize).toFixed(2)} tCO₂</p>
        </div>
      </div>
      
      {portfolioData && portfolioData.projectCount > 1 && (
        <div className="mb-4 p-3 bg-carbon-blue-50 rounded-lg border border-carbon-blue-200">
          <p className="text-sm text-carbon-blue-700">
            <strong>Portfolio-based pricing:</strong> Carbon prices calculated based on total portfolio size of {portfolioData.totalKWp.toLocaleString()} kWp 
            across {portfolioData.projectCount} projects (including this one)
          </p>
        </div>
      )}
      
      <h4 className="font-medium text-carbon-gray-700 mb-2">Projected Revenue by Year</h4>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-carbon-gray-50">
              <TableHead className="text-center text-sm font-medium text-carbon-gray-700">Year</TableHead>
              <TableHead className="text-center text-sm font-medium text-carbon-gray-700">MWh Generated per Year</TableHead>
              <TableHead className="text-center text-sm font-medium text-carbon-gray-700">tCO₂e Offset per Year</TableHead>
              <TableHead className="text-center text-sm font-medium text-carbon-gray-700">Client Carbon Price (R/tCO₂e)</TableHead>
              <TableHead className="text-center text-sm font-medium text-carbon-gray-700">Client Revenue (R) per Year</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Object.entries(revenue).map(([year, amount]) => {
              const yearlyEnergy = calculateYearlyEnergy(systemSizeKWp, parseInt(year), commissionDate);
              const yearlyCarbonCredits = calculateYearlyCarbonCredits(systemSizeKWp, parseInt(year), commissionDate);
              const clientSpecificRevenue = calculateClientSpecificRevenue(year, yearlyCarbonCredits, portfolioSize);
              
              return (
                <TableRow key={year}>
                  <TableCell className="text-sm text-center">{year}</TableCell>
                  <TableCell className="text-sm text-center">{(yearlyEnergy / 1000).toFixed(2)}</TableCell>
                  <TableCell className="text-sm text-center">{yearlyCarbonCredits.toFixed(2)}</TableCell>
                  <TableCell className="text-sm text-center">{getFormattedClientSpecificCarbonPrice(year, portfolioSize)}</TableCell>
                  <TableCell className="text-sm text-center">R {clientSpecificRevenue.toLocaleString()}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
          <TableFooter>
            <TableRow className="bg-carbon-gray-100 font-semibold">
              <TableCell className="text-sm font-bold text-center">Total</TableCell>
              <TableCell className="text-sm text-center font-bold">{totalMWhGenerated.toFixed(2)}</TableCell>
              <TableCell className="text-sm text-center font-bold">{totalCarbonCredits.toFixed(2)}</TableCell>
              <TableCell className="text-sm font-bold text-center">-</TableCell>
              <TableCell className="text-sm text-center font-bold">R {totalClientSpecificRevenue.toLocaleString()}</TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </div>
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
