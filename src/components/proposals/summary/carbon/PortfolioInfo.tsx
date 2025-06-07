
import React from "react";
import { PortfolioData } from "@/services/proposals/portfolioCalculationService";
import { formatSystemSizeForDisplay } from "@/lib/calculations/carbon/normalization";

interface PortfolioInfoProps {
  portfolioData: PortfolioData | null;
}

export function PortfolioInfo({ portfolioData }: PortfolioInfoProps) {
  if (!portfolioData || portfolioData.projectCount <= 1) {
    return null;
  }

  return (
    <div className="mb-4 p-3 bg-carbon-blue-50 rounded-lg border border-carbon-blue-200">
      <p className="text-sm text-carbon-blue-700">
        <strong>Portfolio-based pricing:</strong> Carbon prices calculated based on total portfolio size of {formatSystemSizeForDisplay(portfolioData.totalKWp)} 
        across {portfolioData.projectCount} projects (including this one)
      </p>
    </div>
  );
}
