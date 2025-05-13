
import React from "react";
import { 
  calculateAnnualEnergy, 
  calculateCarbonCredits, 
  calculateRevenue,
  getFormattedCarbonPriceForYear
} from "@/lib/calculations/carbon";

interface CarbonCreditSectionProps {
  systemSize: string;
}

export function CarbonCreditSection({ systemSize }: CarbonCreditSectionProps) {
  const revenue = calculateRevenue(systemSize);

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
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-carbon-gray-50">
              <th className="px-4 py-2 text-left text-sm font-medium text-carbon-gray-700 border border-carbon-gray-200">Year</th>
              <th className="px-4 py-2 text-left text-sm font-medium text-carbon-gray-700 border border-carbon-gray-200">Carbon Price (R/tCO₂)</th>
              <th className="px-4 py-2 text-right text-sm font-medium text-carbon-gray-700 border border-carbon-gray-200">Estimated Revenue (R)</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(revenue).map(([year, amount]) => (
              <tr key={year}>
                <td className="px-4 py-2 text-sm border border-carbon-gray-200">{year}</td>
                <td className="px-4 py-2 text-sm border border-carbon-gray-200">
                  {getFormattedCarbonPriceForYear(year)}
                </td>
                <td className="px-4 py-2 text-sm text-right border border-carbon-gray-200">R {amount.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
