
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
import { getFormattedClientSpecificCarbonPrice, calculateClientSpecificRevenue } from "@/lib/calculations/carbon/clientPricing";
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

interface TableRowData {
  year: string;
  yearlyEnergy: number;
  yearlyCarbonCredits: number;
  clientPrice: string;
  clientRevenue: number;
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
  const [tableData, setTableData] = useState<TableRowData[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const loadTableData = async () => {
      try {
        setLoading(true);
        const data: TableRowData[] = [];
        
        for (const [year, amount] of Object.entries(revenue)) {
          const yearlyEnergy = calculateYearlyEnergy(systemSizeKWp, parseInt(year), commissionDate);
          const yearlyCarbonCredits = calculateYearlyCarbonCredits(systemSizeKWp, parseInt(year), commissionDate);
          const clientPrice = await getFormattedClientSpecificCarbonPrice(year, portfolioSize);
          const clientRevenue = await calculateClientSpecificRevenue(year, yearlyCarbonCredits, portfolioSize);
          
          data.push({
            year,
            yearlyEnergy,
            yearlyCarbonCredits,
            clientPrice,
            clientRevenue
          });
        }
        
        setTableData(data);
      } catch (error) {
        logger.error("Error loading carbon credit table data", { error });
        setTableData([]);
      } finally {
        setLoading(false);
      }
    };
    
    if (Object.keys(revenue).length > 0) {
      loadTableData();
    }
  }, [revenue, systemSizeKWp, commissionDate, portfolioSize]);

  if (loading) {
    return (
      <div className="overflow-x-auto">
        <div className="animate-pulse">
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

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
          {tableData.map((row) => (
            <TableRow key={row.year}>
              <TableCell className="text-sm text-center">{row.year}</TableCell>
              <TableCell className="text-sm text-center">{(row.yearlyEnergy / 1000).toFixed(2)}</TableCell>
              <TableCell className="text-sm text-center">{row.yearlyCarbonCredits.toFixed(2)}</TableCell>
              <TableCell className="text-sm text-center">{row.clientPrice}</TableCell>
              <TableCell className="text-sm text-center">R {row.clientRevenue.toLocaleString()}</TableCell>
            </TableRow>
          ))}
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
