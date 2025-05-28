
import React, { useState, useEffect } from "react";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter
} from "@/components/ui/table";
import { calculateClientSpecificRevenue } from "@/lib/calculations/carbon/clientPricing";
import { dynamicCarbonPricingService } from "@/lib/calculations/carbon/dynamicPricing";
import { calculateYearlyEnergy, calculateYearlyCarbonCredits } from "./carbonCalculations";
import { logger } from "@/lib/logger";

interface CarbonCreditTableProps {
  revenue: Record<string, number>;
  systemSizeKWp: number;
  commissionDate?: string;
  portfolioSize: number;
  totalMWhGenerated: number;
  totalCarbonCredits: number;
  totalClientSpecificRevenue: number;
}

export function CarbonCreditTable({ 
  revenue, 
  systemSizeKWp, 
  commissionDate, 
  portfolioSize,
  totalMWhGenerated,
  totalCarbonCredits,
  totalClientSpecificRevenue
}: CarbonCreditTableProps) {
  const [dynamicPrices, setDynamicPrices] = useState<Record<string, number>>({});
  
  useEffect(() => {
    const loadDynamicPrices = async () => {
      try {
        const prices = await dynamicCarbonPricingService.getCarbonPrices();
        setDynamicPrices(prices);
      } catch (error) {
        logger.error("Error loading dynamic prices for table display", { error });
        setDynamicPrices({});
      }
    };
    
    loadDynamicPrices();
  }, []);
  
  const getFormattedClientSpecificCarbonPrice = (year: string, portfolioSize: number): string => {
    const basePrice = dynamicPrices[year] || 0;
    if (basePrice === 0) return "R 0.00";
    
    // Apply client share percentage to get client-specific price
    // This is a simplified version - the actual logic is in clientPricing.ts
    return `R ${basePrice.toFixed(2)}`;
  };

  return (
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
  );
}
