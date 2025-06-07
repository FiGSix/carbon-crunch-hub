
import React from "react";
import { 
  getClientSharePercentage
} from "@/lib/calculations/carbon";
import { formatSystemSizeForDisplay } from "@/lib/calculations/carbon/normalization";
import { useAuth } from "@/contexts/auth";
import { usePortfolioData } from "./carbon/hooks/usePortfolioData";
import { Skeleton } from "@/components/ui/skeleton";

interface RevenueDistributionSectionProps {
  systemSize: string;
  selectedClientId?: string | null;
  proposalId?: string | null;
  proposalData?: {
    agent_commission_percentage?: number;
    agent_portfolio_kwp?: number;
  } | null;
}

export function RevenueDistributionSection({ 
  systemSize, 
  selectedClientId, 
  proposalId,
  proposalData 
}: RevenueDistributionSectionProps) {
  const { profile } = useAuth();
  const isClient = profile?.role === 'client';
  
  const { portfolioData: clientPortfolioData, loading: clientLoading } = usePortfolioData({
    selectedClientId,
    systemSize,
    proposalId
  });

  if (clientLoading) {
    return (
      <div>
        <h3 className="text-lg font-semibold mb-3 text-carbon-gray-900">Revenue Distribution</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
      </div>
    );
  }

  // Use client portfolio size for client share calculations
  const clientPortfolioSize = clientPortfolioData?.totalKWp || parseFloat(systemSize) || 0;
  const clientSharePercentage = getClientSharePercentage(clientPortfolioSize);

  // Use stored agent commission percentage from proposal data if available
  // This ensures we show the commission rate that was locked at creation time
  const agentCommissionPercentage = proposalData?.agent_commission_percentage || 4; // fallback to default
  const agentPortfolioSize = proposalData?.agent_portfolio_kwp || 0;
  
  const crunchCarbonSharePercentage = 100 - clientSharePercentage - agentCommissionPercentage;

  return (
    <div>
      <h3 className="text-lg font-semibold mb-3 text-carbon-gray-900">Revenue Distribution</h3>
      
      <div className={`grid grid-cols-1 ${isClient ? 'md:grid-cols-1' : 'md:grid-cols-3'} gap-4`}>
        <div className="p-4 bg-carbon-green-50 rounded-lg border border-carbon-green-200">
          <p className="text-sm text-carbon-gray-500">Client Share</p>
          <p className="text-xl font-bold text-carbon-green-600">{clientSharePercentage}%</p>
          <p className="text-xs text-carbon-gray-500 mt-1">
            Based on {formatSystemSizeForDisplay(clientPortfolioSize)} client portfolio
          </p>
        </div>
        
        {!isClient && (
          <>
            <div className="p-4 bg-carbon-blue-50 rounded-lg border border-carbon-blue-200">
              <p className="text-sm text-carbon-gray-500">Agent Commission</p>
              <p className="text-xl font-bold text-carbon-blue-600">{agentCommissionPercentage}%</p>
              <p className="text-xs text-carbon-gray-500 mt-1">
                {agentPortfolioSize > 0 
                  ? `Rate locked at creation (agent portfolio: ${formatSystemSizeForDisplay(agentPortfolioSize)})`
                  : "Rate locked at proposal creation"
                }
              </p>
            </div>
            <div className="p-4 bg-carbon-gray-50 rounded-lg border border-carbon-gray-200">
              <p className="text-sm text-carbon-gray-500">Crunch Carbon Share</p>
              <p className="text-xl font-bold text-carbon-gray-900">
                {crunchCarbonSharePercentage.toFixed(1)}%
              </p>
              <p className="text-xs text-carbon-gray-500 mt-1">Platform fee</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
