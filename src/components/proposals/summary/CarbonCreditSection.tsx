
import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { CarbonCreditSummary } from "./carbon/CarbonCreditSummary";
import { CarbonCreditTable } from "./carbon/CarbonCreditTable";
import { 
  calculateTotalMWhGenerated, 
  calculateTotalCarbonCredits
} from "./carbon/carbonCalculations";
import { usePortfolioData } from "./carbon/hooks/usePortfolioData";
import { useRevenueCalculations } from "./carbon/hooks/useRevenueCalculations";

interface CarbonCreditSectionProps {
  systemSize: string;
  commissionDate?: string;
  selectedClientId?: string | null;
  proposalId?: string | null;
}

export function CarbonCreditSection({ systemSize, commissionDate, selectedClientId, proposalId }: CarbonCreditSectionProps) {
  const { portfolioData, loading: portfolioLoading } = usePortfolioData({
    selectedClientId,
    systemSize,
    proposalId
  });

  const { 
    clientSpecificRevenue, 
    loading: revenueLoading, 
    systemSizeKWp 
  } = useRevenueCalculations({
    systemSize,
    commissionDate,
    portfolioData,
    proposalId
  });

  const loading = portfolioLoading || revenueLoading;

  // Use client-specific revenue for display (this is what the client actually gets)
  const displayRevenue = clientSpecificRevenue;

  // Calculate totals using helper functions
  const totalMWhGenerated = calculateTotalMWhGenerated(systemSizeKWp, displayRevenue, commissionDate);
  const totalCarbonCredits = calculateTotalCarbonCredits(systemSizeKWp, displayRevenue, commissionDate);
  const totalClientSpecificRevenue = Object.values(clientSpecificRevenue).reduce((sum: number, val: number) => sum + val, 0);

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
      
      <CarbonCreditSummary systemSize={systemSize} />
      
      <h4 className="font-medium text-carbon-gray-700 mb-2">Client Revenue by Year</h4>
      
      <CarbonCreditTable 
        revenue={displayRevenue}
        systemSizeKWp={systemSizeKWp}
        commissionDate={commissionDate}
        portfolioSize={portfolioData?.totalKWp || systemSizeKWp}
        totalMWhGenerated={totalMWhGenerated}
        totalCarbonCredits={totalCarbonCredits}
        totalClientSpecificRevenue={totalClientSpecificRevenue}
      />
      
      {commissionDate && (
        <p className="text-xs text-carbon-gray-500 mt-2">
          * Values for commissioning year are pro-rated based on the commission date
        </p>
      )}
    </div>
  );
}
