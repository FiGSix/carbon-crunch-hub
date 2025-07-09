
import React, { memo } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RecentProjectsNew } from "@/components/dashboard/preview/RecentProjectsNew";
import { OptimizedStatsCardsSection } from "@/components/dashboard/sections/OptimizedStatsCardsSection";
import { ChartsSection } from "@/components/dashboard/sections/ChartsSection";
import { AgentIntroVideoModal } from "@/components/agent/AgentIntroVideoModal";
import { useUnifiedDashboardData } from "@/hooks/dashboard/useUnifiedDashboardData";
import { useAgentIntroVideo } from "@/hooks/useAgentIntroVideo";
import { useOptimizedAgentPortfolio } from "@/hooks/dashboard/useOptimizedAgentPortfolio";
import { useDashboardHelpers } from "@/hooks/dashboard/useDashboardHelpers";
import { useAuth } from "@/contexts/auth";

const Dashboard = memo(() => {
  const { userRole } = useAuth();
  
  // Single unified data source - replaces multiple scattered hooks
  const {
    data: dashboardData,
    isLoading: loading,
    error,
    refetch
  } = useUnifiedDashboardData();

  // Helper functions with stable references
  const {
    getWelcomeMessage,
    getUserDisplayName,
    formatUserRole,
    handleRefreshProposals
  } = useDashboardHelpers(() => refetch());

  const {
    isModalOpen,
    isUpdating,
    markVideoAsViewed,
    skipVideo,
    closeModal
  } = useAgentIntroVideo();

  // Load agent portfolio data only for agents
  const { 
    portfolioData: agentPortfolioData, 
    loading: agentPortfolioLoading 
  } = useOptimizedAgentPortfolio();

  // Handle loading and error states
  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (error || !dashboardData) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <p className="text-muted-foreground mb-4">Failed to load dashboard data</p>
            <Button onClick={handleRefreshProposals} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }
  
  return (
    <DashboardLayout>
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
      
      <OptimizedStatsCardsSection 
        userRole={userRole}
        portfolioSize={dashboardData.portfolioSize}
        totalProposals={dashboardData.totalProposals}
        potentialRevenue={dashboardData.potentialRevenue}
        co2Offset={dashboardData.co2Offset}
        loading={false}
      />
      
      {shouldRenderCharts(userRole) && (
        <ChartsSection userRole={userRole} />
      )}
      
      <div className="grid grid-cols-1 gap-6">
        <RecentProjectsNew 
          proposals={dashboardData.proposals}
          loading={false}
          onRefresh={handleRefreshProposals}
        />
      </div>

      {/* Agent Introduction Video Modal */}
      <AgentIntroVideoModal
        isOpen={isModalOpen}
        onVideoComplete={markVideoAsViewed}
        onSkip={skipVideo}
        isUpdating={isUpdating}
        onClose={closeModal}
      />
    </DashboardLayout>
  );
});

// Memoized helper function to determine if charts should be rendered
const shouldRenderCharts = (userRole: string | null): boolean => {
  return userRole !== 'agent';
};

export default Dashboard;
