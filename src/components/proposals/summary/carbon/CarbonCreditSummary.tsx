
import React from "react";
import { calculateAnnualEnergy, calculateCarbonCredits, normalizeToKWp } from "@/lib/calculations/carbon";

interface CarbonCreditSummaryProps {
  systemSize: string;
}

export function CarbonCreditSummary({ systemSize }: CarbonCreditSummaryProps) {
  const systemSizeKWp = normalizeToKWp(systemSize);
  const annualEnergy = calculateAnnualEnergy(systemSizeKWp);
  const carbonCredits = calculateCarbonCredits(systemSizeKWp);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
      <div>
        <p className="text-sm text-carbon-gray-500">Estimated Annual Energy</p>
        <p className="font-medium">{annualEnergy.toLocaleString()} kWh</p>
      </div>
      <div>
        <p className="text-sm text-carbon-gray-500">Estimated Annual Carbon Credits</p>
        <p className="font-medium">{carbonCredits.toFixed(2)} tCO₂</p>
      </div>
    </div>
  );
}
