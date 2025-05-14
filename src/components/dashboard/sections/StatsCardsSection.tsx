
import React from "react";
import { StatsCardNew } from "@/components/dashboard/preview/StatsCardNew";
import { CommissionCard } from "@/components/dashboard/preview/CommissionCard";
import { FileText, TrendingUp, Wind, Leaf } from "lucide-react";
import { UserRole } from "@/lib/supabase/types";

interface StatsCardsSectionProps {
  userRole: string | null;
  portfolioSize: number;
  totalProposals: number;
  potentialRevenue: number;
  co2Offset: number;
}

export function StatsCardsSection({
  userRole,
  portfolioSize,
  totalProposals,
  potentialRevenue,
  co2Offset,
}: StatsCardsSectionProps) {
  if (userRole === 'agent') {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 h-full">
            <StatsCardNew 
              title="Portfolio Size" 
              value={`${portfolioSize} MWp`} 
              icon={<Wind className="h-5 w-5 text-crunch-yellow" />}
              trend="+14%"
              trendDirection="up"
              color="emerald"
            />
            
            <CommissionCard portfolioSize={portfolioSize} />
            
            <StatsCardNew 
              title="Total Proposals" 
              value={totalProposals} 
              icon={<FileText className="h-5 w-5 text-crunch-yellow" />}
              trend="+3"
              trendDirection="up"
              color="blue"
            />
            
            <StatsCardNew 
              title="Potential Revenue" 
              value={`R ${potentialRevenue.toLocaleString()}`} 
              icon={<TrendingUp className="h-5 w-5 text-crunch-yellow" />}
              trend="+12%"
              trendDirection="up"
              color="yellow"
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <StatsCardNew 
        title="Portfolio Size" 
        value={`${portfolioSize} MWp`} 
        icon={<Wind className="h-5 w-5 text-crunch-yellow" />}
        trend="+14%"
        trendDirection="up"
        color="emerald"
      />
      
      <StatsCardNew 
        title="Total Proposals" 
        value={totalProposals} 
        icon={<FileText className="h-5 w-5 text-crunch-yellow" />}
        trend="+3"
        trendDirection="up"
        color="blue"
      />
      
      <StatsCardNew 
        title="Potential Revenue" 
        value={`R ${potentialRevenue.toLocaleString()}`} 
        icon={<TrendingUp className="h-5 w-5 text-crunch-yellow" />}
        trend="+12%"
        trendDirection="up"
        color="yellow"
      />
      
      <StatsCardNew 
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
