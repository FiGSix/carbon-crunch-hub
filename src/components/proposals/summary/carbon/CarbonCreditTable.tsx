
import { useState, useEffect } from "react";
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
  isPhaseTable?: boolean;
  preCalculatedYearlyMWh?: Record<string, number>;
  preCalculatedYearlyCredits?: Record<string, number>;
  clientShareOverride?: number;
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
  totalClientSpecificRevenue,
  isPhaseTable = false,
  preCalculatedYearlyMWh,
  preCalculatedYearlyCredits,
  clientShareOverride
}: CarbonCreditTableProps) {
  const [tableData, setTableData] = useState<TableRowData[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const loadTableData = async () => {
      try {
        setLoading(true);
        
        // Handle empty revenue gracefully
        if (Object.keys(revenue).length === 0) {
          setTableData([]);
          return;
        }
        
        const data: TableRowData[] = [];
        
        for (const [year, amount] of Object.entries(revenue)) {
          // Use pre-calculated data if available (multi-phase consolidated), otherwise calculate
          const yearlyEnergy = preCalculatedYearlyMWh?.[year] !== undefined
            ? preCalculatedYearlyMWh[year] * 1000 // Convert MWh back to kWh for consistency
            : calculateYearlyEnergy(systemSizeKWp, parseInt(year), commissionDate);
            
          const yearlyCarbonCredits = preCalculatedYearlyCredits?.[year] !== undefined
            ? preCalculatedYearlyCredits[year]
            : calculateYearlyCarbonCredits(systemSizeKWp, parseInt(year), commissionDate);
          
          const clientPrice = await getFormattedClientSpecificCarbonPrice(year, portfolioSize, clientShareOverride);
          const clientRevenue = await calculateClientSpecificRevenue(year, yearlyCarbonCredits, portfolioSize, clientShareOverride);
          
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
    
    loadTableData();
  }, [revenue, systemSizeKWp, commissionDate, portfolioSize, preCalculatedYearlyMWh, preCalculatedYearlyCredits]);

  if (loading) {
    return (
      <div className="overflow-x-auto">
        <div className="animate-pulse">
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!loading && tableData.length === 0) {
    return (
      <div className="overflow-x-auto">
        <div className="p-8 text-center text-muted-foreground">
          <p>No carbon credit projection data available for this configuration.</p>
          <p className="text-sm mt-2">Check that commission dates are valid and pricing exists for the selected years (currently through 2030).</p>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table className={isPhaseTable ? 'text-sm' : ''}>
        <TableHeader>
          <TableRow className={isPhaseTable ? 'bg-muted/50' : 'bg-carbon-gray-50'}>
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
