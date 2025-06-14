
import React from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RecentProjectsNew } from "@/components/dashboard/preview/RecentProjectsNew";
import { StatsCardsSection } from "@/components/dashboard/sections/StatsCardsSection";
import { ChartsSection } from "@/components/dashboard/sections/ChartsSection";
import { AgentIntroVideoModal } from "@/components/agent/AgentIntroVideoModal";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useAgentIntroVideo } from "@/hooks/useAgentIntroVideo";

const Dashboard = () => {
  const {
    userRole,
    proposals,
    loading,
    portfolioSize,
    totalProposals,
    potentialRevenue,
    co2Offset,
    getWelcomeMessage,
    getUserDisplayName,
    formatUserRole,
    handleRefreshProposals
  } = useDashboardData();

  const {
    isModalOpen,
    isUpdating,
    markVideoAsViewed,
    skipVideo
  } = useAgentIntroVideo();
  
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
      
      <StatsCardsSection 
        userRole={userRole}
        portfolioSize={portfolioSize}
        totalProposals={totalProposals}
        potentialRevenue={potentialRevenue}
        co2Offset={co2Offset}
        proposals={proposals}
        loading={loading}
      />
      
      {userRole !== 'agent' && renderCharts(userRole) && (
        <ChartsSection userRole={userRole} />
      )}
      
      <div className="grid grid-cols-1 gap-6">
        <RecentProjectsNew 
          proposals={proposals}
          loading={loading}
          onRefresh={handleRefreshProposals}
        />
      </div>

      {/* Agent Introduction Video Modal */}
      <AgentIntroVideoModal
        isOpen={isModalOpen}
        onVideoComplete={markVideoAsViewed}
        onSkip={skipVideo}
        isUpdating={isUpdating}
      />
    </DashboardLayout>
  );
};

// Helper function to determine if charts should be rendered
function renderCharts(userRole: string | null): boolean {
  return userRole !== 'agent';
}

export default Dashboard;
