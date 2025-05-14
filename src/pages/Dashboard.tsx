
import React from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { StatsCardNew } from "@/components/dashboard/preview/StatsCardNew";
import { RevenueChart } from "@/components/dashboard/RevenueChart";
import { CO2OffsetChart } from "@/components/dashboard/CO2OffsetChart";
import { RecentProjectsNew } from "@/components/dashboard/preview/RecentProjectsNew";
import { FileText, TrendingUp, Wind, Leaf, RefreshCw, AlertTriangle } from "lucide-react";
import { useAuth } from "@/contexts/auth"; // Updated import path
import { Button } from "@/components/ui/button";
import { useProposals } from "@/hooks/useProposals";
import { useEffect } from "react";
import { CommissionCard } from "@/components/dashboard/preview/CommissionCard";
import { DealStatusChart } from "@/components/dashboard/preview/DealStatusChart";
import { useNavigate } from "react-router-dom";

interface DashboardProps {
  isPreview?: boolean;
}

const Dashboard = ({ isPreview = false }: DashboardProps) => {
  const navigate = useNavigate();
  const { profile, userRole } = useAuth();
  const { proposals, fetchProposals, loading } = useProposals();
  
  // Log when dashboard mounts or proposals update
  useEffect(() => {
    console.log(`${isPreview ? 'Preview' : ''} Dashboard rendered with proposals count:`, proposals.length);
  }, [proposals.length, isPreview]);
  
  const portfolioSize = 12.5; // MWp
  const totalProposals = proposals.length || 8;
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
    console.log(`Manually refreshing proposals from ${isPreview ? 'preview ' : ''}dashboard`);
    fetchProposals();
  };
  
  const renderStatsCards = () => {
    if (userRole === 'agent') {
      return (
        <>
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
        </>
      );
    }

    return (
      <>
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
      </>
    );
  };

  const renderCharts = () => {
    if (userRole === 'agent') {
      return null;
    }

    return (
      <>
        <RevenueChart />
        <CO2OffsetChart />
      </>
    );
  };
  
  return (
    <DashboardLayout>
      {isPreview && (
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
      )}

      <DashboardHeader 
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
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''} text-crunch-yellow`} />
            Refresh Data
          </Button>
        }
      />
      
      {userRole === 'agent' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 h-full">
              {renderStatsCards()}
            </div>
          </div>
          
          <div className="lg:col-span-1 h-full">
            <DealStatusChart />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {renderStatsCards()}
        </div>
      )}
      
      {renderCharts() && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {renderCharts()}
        </div>
      )}
      
      <div className="grid grid-cols-1 gap-6">
        <RecentProjectsNew 
          proposals={proposals}
          loading={loading}
          onRefresh={handleRefreshProposals}
        />
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
