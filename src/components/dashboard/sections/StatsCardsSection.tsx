
import React from "react";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { CommissionCard } from "@/components/dashboard/preview/CommissionCard";
import { DealStatusCard } from "@/components/dashboard/preview/DealStatusCard";
import { FileText, TrendingUp, Wind, Leaf } from "lucide-react";
import { UserRole } from "@/lib/supabase/types";
import { ProposalListItem } from "@/types/proposals";
import { formatSystemSizeForDisplay } from "@/lib/calculations/carbon";

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

  // Get agent-specific revenue description
  const getAgentRevenueDescription = () => {
    const filteredProposals = proposals.filter(p => 
      p.status === 'pending' || 
      p.status === 'draft' || 
      p.status === 'approved' || 
      p.status === 'signed'
    );
    const currentYear = new Date().getFullYear();
    const yearsRemaining = Math.max(0, 2030 - currentYear);
    
    return `Projected commission from ${filteredProposals.length} active proposals over ${yearsRemaining} years until 2030`;
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
        
        <div className="sm:col-span-2">
          <StatsCard 
            title="Commission Projection" 
            value={`R ${potentialRevenue.toLocaleString()}`} 
            icon={<TrendingUp className="h-5 w-5 text-crunch-yellow" />}
            trend="+12%"
            trendDirection="up"
            color="yellow"
            className="bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-200"
          />
          <p className="text-sm text-gray-600 mt-2 px-6 pb-4">
            {getAgentRevenueDescription()}
          </p>
        </div>
        
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
