
import React from "react";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter
} from "@/components/ui/table";
import { 
  getFormattedClientSpecificCarbonPrice,
  calculateClientSpecificRevenue
} from "@/lib/calculations/carbon";
import { calculateYearlyEnergy, calculateYearlyCarbonCredits } from "./carbonCalculations";

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
