
import React from "react";
import { 
  getClientSharePercentage,
  getAgentCommissionPercentage
} from "@/lib/calculations/carbon";
import { useAuth } from "@/contexts/auth";
import { usePortfolioData } from "./carbon/hooks/usePortfolioData";
import { useAgentPortfolioData } from "./carbon/hooks/useAgentPortfolioData";
import { Skeleton } from "@/components/ui/skeleton";

interface RevenueDistributionSectionProps {
  systemSize: string;
  selectedClientId?: string | null;
  proposalId?: string | null;
}

export function RevenueDistributionSection({ systemSize, selectedClientId, proposalId }: RevenueDistributionSectionProps) {
  const { profile } = useAuth();
  const isClient = profile?.role === 'client';
  
  const { portfolioData: clientPortfolioData, loading: clientLoading } = usePortfolioData({
    selectedClientId,
    systemSize,
    proposalId
  });

  const { agentPortfolioData, loading: agentLoading } = useAgentPortfolioData({
    systemSize,
    proposalId
  });

  const loading = clientLoading || agentLoading;

  if (loading) {
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

  // Use agent portfolio size for agent commission calculations
  const agentPortfolioSize = agentPortfolioData?.totalKWp || parseFloat(systemSize) || 0;
  const agentCommissionPercentage = getAgentCommissionPercentage(agentPortfolioSize);
  
  const crunchCarbonSharePercentage = 100 - clientSharePercentage - agentCommissionPercentage;

  return (
    <div>
      <h3 className="text-lg font-semibold mb-3 text-carbon-gray-900">Revenue Distribution</h3>
      
      <div className={`grid grid-cols-1 ${isClient ? 'md:grid-cols-1' : 'md:grid-cols-3'} gap-4`}>
        <div className="p-4 bg-carbon-green-50 rounded-lg border border-carbon-green-200">
          <p className="text-sm text-carbon-gray-500">Client Share</p>
          <p className="text-xl font-bold text-carbon-green-600">{clientSharePercentage}%</p>
          <p className="text-xs text-carbon-gray-500 mt-1">
            Based on {clientPortfolioSize.toLocaleString()} kWp client portfolio
          </p>
        </div>
        
        {!isClient && (
          <>
            <div className="p-4 bg-carbon-blue-50 rounded-lg border border-carbon-blue-200">
              <p className="text-sm text-carbon-gray-500">Agent Commission</p>
              <p className="text-xl font-bold text-carbon-blue-600">{agentCommissionPercentage}%</p>
              <p className="text-xs text-carbon-gray-500 mt-1">
                Based on {agentPortfolioSize.toLocaleString()} kWp agent portfolio
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
