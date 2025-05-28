
import React from "react";
import { calculateAnnualEnergy, calculateCarbonCredits } from "@/lib/calculations/carbon";

interface CarbonCreditSummaryProps {
  systemSize: string;
}

export function CarbonCreditSummary({ systemSize }: CarbonCreditSummaryProps) {
  return (
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
  );
}
