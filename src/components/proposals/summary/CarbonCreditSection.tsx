
import React from "react";
import { 
  calculateAnnualEnergy, 
  calculateCarbonCredits, 
  calculateRevenue,
  getFormattedCarbonPriceForYear,
  normalizeToKWp
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

interface CarbonCreditSectionProps {
  systemSize: string;
  commissionDate?: string;
}

/**
 * Helper function to calculate pro-rated energy generation for a specific year
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
    const yearStart = new Date(year, 0, 1);
    const yearEnd = new Date(year, 11, 31);
    const remainingDays = Math.max(0, Math.floor((yearEnd.getTime() - commissionDateTime.getTime()) / (1000 * 60 * 60 * 24)) + 1);
    const totalDaysInYear = Math.floor((yearEnd.getTime() - yearStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    
    return fullYearEnergy * (remainingDays / totalDaysInYear);
  }
  
  return fullYearEnergy;
}

/**
 * Helper function to calculate pro-rated carbon credits for a specific year
 */
function calculateYearlyCarbonCredits(systemSizeKWp: number, year: number, commissionDate?: string): number {
  const yearlyEnergy = calculateYearlyEnergy(systemSizeKWp, year, commissionDate);
  // Convert kWh to MWh and then to tCO₂ using the emission factor (0.928 tCO₂/MWh)
  return (yearlyEnergy / 1000) * 0.928;
}

export function CarbonCreditSection({ systemSize, commissionDate }: CarbonCreditSectionProps) {
  const systemSizeKWp = normalizeToKWp(systemSize);
  
  // Calculate revenue with commission date for pro-rata logic
  const revenue = calculateRevenue(systemSize, commissionDate);

  // Calculate totals
  const totalMWhGenerated = Object.keys(revenue).reduce((total, year) => {
    const yearlyEnergy = calculateYearlyEnergy(systemSizeKWp, parseInt(year), commissionDate);
    return total + (yearlyEnergy / 1000); // Convert kWh to MWh
  }, 0);

  const totalCarbonCredits = Object.keys(revenue).reduce((total, year) => {
    const yearlyCarbonCredits = calculateYearlyCarbonCredits(systemSizeKWp, parseInt(year), commissionDate);
    return total + yearlyCarbonCredits;
  }, 0);

  const totalRevenue = Object.values(revenue).reduce((sum, amount) => sum + amount, 0);

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
      
      <h4 className="font-medium text-carbon-gray-700 mb-2">Projected Revenue by Year</h4>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-carbon-gray-50">
              <TableHead className="text-center text-sm font-medium text-carbon-gray-700">Year</TableHead>
              <TableHead className="text-center text-sm font-medium text-carbon-gray-700">MWh Generated per Year</TableHead>
              <TableHead className="text-center text-sm font-medium text-carbon-gray-700">tCO₂e Offset per Year</TableHead>
              <TableHead className="text-center text-sm font-medium text-carbon-gray-700">Carbon Price (R/tCO₂e)</TableHead>
              <TableHead className="text-center text-sm font-medium text-carbon-gray-700">Estimated Revenue (R) per Year</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Object.entries(revenue).map(([year, amount]) => {
              const yearlyEnergy = calculateYearlyEnergy(systemSizeKWp, parseInt(year), commissionDate);
              const yearlyCarbonCredits = calculateYearlyCarbonCredits(systemSizeKWp, parseInt(year), commissionDate);
              
              return (
                <TableRow key={year}>
                  <TableCell className="text-sm text-center">{year}</TableCell>
                  <TableCell className="text-sm text-center">{(yearlyEnergy / 1000).toFixed(2)}</TableCell>
                  <TableCell className="text-sm text-center">{yearlyCarbonCredits.toFixed(2)}</TableCell>
                  <TableCell className="text-sm text-center">{getFormattedCarbonPriceForYear(year)}</TableCell>
                  <TableCell className="text-sm text-center">R {amount.toLocaleString()}</TableCell>
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
              <TableCell className="text-sm text-center font-bold">R {totalRevenue.toLocaleString()}</TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </div>
      {commissionDate && (
        <p className="text-xs text-carbon-gray-500 mt-2">
          * Values for commissioning year are pro-rated based on the commission date
        </p>
      )}
    </div>
  );
}
