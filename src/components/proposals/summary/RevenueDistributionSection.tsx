

import { 
  getClientSharePercentage
} from "@/lib/calculations/carbon";
import { formatSystemSizeForDisplay } from "@/lib/calculations/carbon/normalization";
import { useAuth } from "@/contexts/auth";
import { usePortfolioData } from "./carbon/hooks/usePortfolioData";
import { useRevenueCalculations } from "./carbon/hooks/useRevenueCalculations";
import { Skeleton } from "@/components/ui/skeleton";
import { ProjectPhase } from "@/types/proposals";

interface RevenueDistributionSectionProps {
  systemSize: string;
  selectedClientId?: string | null;
  proposalId?: string | null;
  proposalData?: {
    agent_commission_percentage?: number;
    agent_portfolio_kwp?: number;
    client_share_percentage?: number;
  } | null;
  isClient?: boolean;
  token?: string | null;
  commissionDate?: string;
  phases?: ProjectPhase[];
  isMultiPhase?: boolean;
}

const formatRand = (value: number) =>
  `R ${Math.round(value).toLocaleString("en-ZA")}`;

export function RevenueDistributionSection({ 
  systemSize, 
  selectedClientId, 
  proposalId,
  proposalData,
  isClient: isClientProp,
  token,
  commissionDate,
  phases,
  isMultiPhase,
}: RevenueDistributionSectionProps) {
  const { profile, user } = useAuth();
  
  const displayIsClient = isClientProp !== undefined 
    ? isClientProp 
    : (profile?.role === 'client' || (!!token && !user));
  
  const { portfolioData, loading: portfolioLoading } = usePortfolioData({
    selectedClientId,
    systemSize,
    proposalId
  });

  const clientPortfolioSize = portfolioData?.totalKWp || parseFloat(systemSize) || 0;
  const clientSharePercentage = proposalData?.client_share_percentage 
    ?? getClientSharePercentage(clientPortfolioSize);

  const agentCommissionPercentage = proposalData?.agent_commission_percentage ?? 4;
  const agentPortfolioSize = proposalData?.agent_portfolio_kwp || 0;
  const crunchCarbonSharePercentage = 100 - clientSharePercentage - agentCommissionPercentage;

  const { clientSpecificRevenue, loading: revenueLoading } = useRevenueCalculations({
    systemSize,
    commissionDate,
    portfolioData,
    proposalId,
    phases,
    isMultiPhase,
    clientShareOverride: proposalData?.client_share_percentage ?? null,
  });

  const loading = portfolioLoading || revenueLoading;

  const totalClientRevenue = Object.values(clientSpecificRevenue).reduce(
    (sum: number, val: number) => sum + (val || 0), 0
  );
  const totalPool = clientSharePercentage > 0 
    ? totalClientRevenue / (clientSharePercentage / 100) 
    : 0;
  const agentRevenue = totalPool * (agentCommissionPercentage / 100);
  const platformRevenue = totalPool * (crunchCarbonSharePercentage / 100);

  if (loading) {
    return (
      <div>
        <h3 className="text-lg font-semibold mb-3 text-carbon-gray-900">Revenue Distribution</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-lg font-semibold mb-3 text-carbon-gray-900">Revenue Distribution</h3>
      
      <div className={`grid grid-cols-1 ${displayIsClient ? 'md:grid-cols-1' : 'md:grid-cols-3'} gap-4`}>
        <div className="p-4 bg-carbon-green-50 rounded-lg border border-carbon-green-200">
          <p className="text-sm text-carbon-gray-500">Client Share</p>
          <p className="text-xl font-bold text-carbon-green-600">{clientSharePercentage}%</p>
          <p className="text-sm font-semibold text-carbon-green-700 mt-1">
            {formatRand(totalClientRevenue)}
          </p>
          <p className="text-xs text-carbon-gray-500 mt-1">
            Based on {formatSystemSizeForDisplay(clientPortfolioSize)} client portfolio
          </p>
        </div>
        
        {!displayIsClient && (
          <>
            <div className="p-4 bg-carbon-blue-50 rounded-lg border border-carbon-blue-200">
              <p className="text-sm text-carbon-gray-500">Agent Commission</p>
              <p className="text-xl font-bold text-carbon-blue-600">{agentCommissionPercentage}%</p>
              <p className="text-sm font-semibold text-carbon-blue-700 mt-1">
                {formatRand(agentRevenue)}
              </p>
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
              <p className="text-sm font-semibold text-carbon-gray-900 mt-1">
                {formatRand(platformRevenue)}
              </p>
              <p className="text-xs text-carbon-gray-500 mt-1">Platform fee</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
