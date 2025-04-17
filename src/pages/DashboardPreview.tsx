
import React from "react";
import { DashboardLayoutNew } from "@/components/layout/preview/DashboardLayoutNew";
import { DashboardHeaderNew } from "@/components/dashboard/preview/DashboardHeaderNew";
import { StatsCardNew } from "@/components/dashboard/preview/StatsCardNew";
import { RevenueChartNew } from "@/components/dashboard/preview/RevenueChartNew";
import { CO2OffsetChartNew } from "@/components/dashboard/preview/CO2OffsetChartNew";
import { RecentProjectsNew } from "@/components/dashboard/preview/RecentProjectsNew";
import { FileText, TrendingUp, Wind, Leaf, RefreshCw } from "lucide-react";
import { useAuth } from "@/contexts/auth";
import { Button } from "@/components/ui/button";
import { useProposals } from "@/hooks/useProposals";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle } from "lucide-react";

const DashboardPreview = () => {
  const navigate = useNavigate();
  const { profile, userRole } = useAuth();
  const { proposals, fetchProposals, loading } = useProposals();
  
  // Mock data for stats (could be calculated from proposals in the future)
  const portfolioSize = 12.5; // MWp
  const totalProjects = proposals.length || 8;
  const potentialRevenue = 284350; // in Rands
  const co2Offset = 1245; // in tCO2
  
  const getWelcomeMessage = () => {
    if (profile?.first_name) {
      return `Welcome back, ${profile.first_name}!`;
    }
    return 'Welcome back!';
  };
  
  const getUserDisplayName = () => {
    if (profile?.first_name && profile?.last_name) {
      return `${profile.first_name} ${profile.last_name}`;
    } else if (profile?.first_name) {
      return profile.first_name;
    } else if (profile?.company_name) {
      return profile.company_name;
    }
    return 'User';
  };
  
  const formatUserRole = (role: string | null): string => {
    if (!role) return '';
    return role.charAt(0).toUpperCase() + role.slice(1);
  };
  
  const handleRefreshProposals = () => {
    fetchProposals();
  };
  
  return (
    <DashboardLayoutNew>
      <div className="bg-crunch-yellow/10 py-3 px-4 rounded-lg mb-6 flex items-center justify-between">
        <div className="flex items-center">
          <AlertTriangle className="h-5 w-5 text-crunch-yellow mr-2" />
          <p className="text-sm font-medium">This is a preview of the new dashboard design. <span className="font-bold">No functionality has changed.</span></p>
        </div>
        <Button 
          variant="outline"
          size="sm"
          onClick={() => navigate('/dashboard')}
        >
          Go back to current dashboard
        </Button>
      </div>

      <DashboardHeaderNew 
        title="Dashboard" 
        description={`${getWelcomeMessage()} Here's an overview of your carbon credits.`}
        userName={getUserDisplayName()}
        userRole={formatUserRole(userRole)}
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefreshProposals}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh Data
          </Button>
        }
      />
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatsCardNew 
          title="Portfolio Size" 
          value={`${portfolioSize} MWp`} 
          icon={<Wind className="h-5 w-5 text-emerald-600" />}
          trend="+14%"
          trendDirection="up"
          color="emerald"
        />
        
        <StatsCardNew 
          title="Total Projects" 
          value={totalProjects} 
          icon={<FileText className="h-5 w-5 text-blue-600" />}
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
          icon={<Leaf className="h-5 w-5 text-green-600" />}
          trend="+6%"
          trendDirection="up"
          color="green"
        />
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <RevenueChartNew />
        <CO2OffsetChartNew />
      </div>
      
      <div className="grid grid-cols-1 gap-6">
        <RecentProjectsNew 
          proposals={proposals}
          loading={loading}
          onRefresh={handleRefreshProposals}
        />
      </div>
    </DashboardLayoutNew>
  );
};

export default DashboardPreview;
