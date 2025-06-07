import React from "react";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { CommissionCard } from "@/components/dashboard/preview/CommissionCard";
import { CommissionProjectionCard } from "@/components/dashboard/preview/CommissionProjectionCard";
import { DealStatusCard } from "@/components/dashboard/preview/DealStatusCard";
import { FileText, TrendingUp, Wind, Leaf } from "lucide-react";
import { UserRole } from "@/lib/supabase/types";
import { ProposalListItem } from "@/types/proposals";
import { formatSystemSizeForDisplay } from "@/lib/calculations/carbon";
import { useAgentCommissionStats } from "@/hooks/dashboard/useAgentCommissionStats";

interface StatsCardsSectionProps {
  userRole: string | null;
  portfolioSize: number;
  totalProposals: number;
  potentialRevenue: number;
  co2Offset: number;
  proposals?: ProposalListItem[];
  loading?: boolean;
}

export function StatsCardsSection({
  userRole,
  portfolioSize,
  totalProposals,
  potentialRevenue,
  co2Offset,
  proposals = [],
  loading = false,
}: StatsCardsSectionProps) {
  
  // Get agent commission stats for the new card
  const agentCommissionStats = useAgentCommissionStats(proposals);
  
  // Format portfolio size based on user role
  const getPortfolioDisplayValue = () => {
    if (userRole === 'agent') {
      // For agents, portfolioSize is kWp value, so format it properly
      return formatSystemSizeForDisplay(portfolioSize);
    } else {
      // For other roles, portfolioSize is proposal count
      return portfolioSize;
    }
  };

  if (userRole === 'agent') {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
        <StatsCard 
          title="Portfolio Size" 
          value={getPortfolioDisplayValue()} 
          icon={<Wind className="h-5 w-5 text-crunch-yellow" />}
          trend="+14%"
          trendDirection="up"
          color="emerald"
        />
        
        <CommissionCard portfolioSize={portfolioSize} />
        
        <CommissionProjectionCard 
          projectedCommission={agentCommissionStats.projectedCommission}
          filteredProposalsCount={agentCommissionStats.filteredProposalsCount}
        />
        
        <DealStatusCard proposals={proposals} loading={loading} />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <StatsCard 
        title="Portfolio Size" 
        value={getPortfolioDisplayValue()} 
        icon={<Wind className="h-5 w-5 text-crunch-yellow" />}
        trend="+14%"
        trendDirection="up"
        color="emerald"
      />
      
      <StatsCard 
        title="Total Proposals" 
        value={totalProposals} 
        icon={<FileText className="h-5 w-5 text-crunch-yellow" />}
        trend="+3"
        trendDirection="up"
        color="blue"
      />
      
      <StatsCard 
        title="Potential Revenue" 
        value={`R ${potentialRevenue.toLocaleString()}`} 
        icon={<TrendingUp className="h-5 w-5 text-crunch-yellow" />}
        trend="+12%"
        trendDirection="up"
        color="yellow"
      />
      
      <StatsCard 
        title="CO₂ Offset" 
        value={`${co2Offset} tCO₂`} 
        icon={<Leaf className="h-5 w-5 text-crunch-yellow" />}
        trend="+6%"
        trendDirection="up"
        color="green"
      />
    </div>
  );
}
