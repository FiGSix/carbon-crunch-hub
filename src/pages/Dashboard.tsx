
import React, { memo } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { RefreshCw, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { RecentProjectsNew } from "@/components/dashboard/preview/RecentProjectsNew";
import { DashboardMetricsByStageCards } from "@/components/dashboard/sections/DashboardMetricsByStageCards";
import { AgentIntroVideoModal } from "@/components/agent/AgentIntroVideoModal";
import { useUnifiedDashboardData } from "@/hooks/dashboard/useUnifiedDashboardData";
import { useDashboardMetricsByStage, getEmptyMetrics } from "@/hooks/dashboard/useDashboardMetricsByStage";
import { useAgentIntroVideo } from "@/hooks/useAgentIntroVideo";
import { useDashboardHelpers } from "@/hooks/dashboard/useDashboardHelpers";
import { useAuth } from "@/contexts/auth";
import { QueryErrorBoundary } from "@/components/common/QueryErrorBoundary";

const Dashboard = memo(() => {
  const { userRole, profile } = useAuth();
  
  // Phase 4: Fetch dashboard metrics by stage (4 new cards)
  const {
    data: metrics,
    isLoading: metricsLoading,
    error: metricsError,
    refetch: refetchMetrics
  } = useDashboardMetricsByStage();

  // Fetch proposals for Recent Projects section
  const {
    data: dashboardData,
    isLoading: proposalsLoading,
    error: proposalsError,
    refetch: refetchProposals
  } = useUnifiedDashboardData();

  // Helper functions with stable references
  const {
    getWelcomeMessage,
    getUserDisplayName,
    formatUserRole
  } = useDashboardHelpers(() => {
    refetchMetrics();
    refetchProposals();
  });

  const {
    isModalOpen,
    isUpdating,
    markVideoAsViewed,
    skipVideo,
    closeModal
  } = useAgentIntroVideo();

  const loading = metricsLoading || proposalsLoading;

  // Handle loading and error states
  if (loading && !metrics && !dashboardData) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if ((metricsError || proposalsError) && !metrics && !dashboardData) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <p className="text-muted-foreground mb-4">Failed to load dashboard data</p>
            <Button 
              onClick={() => {
                refetchMetrics();
                refetchProposals();
              }} 
              variant="outline"
            >
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
        description={`${getWelcomeMessage()} Here's an overview of your carbon credit projects.`}
        userName={getUserDisplayName()}
        userRole={formatUserRole(userRole)}
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              refetchMetrics();
              refetchProposals();
            }}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''} text-crunch-yellow`} />
            Refresh Data
          </Button>
        }
      />
      
      {/* Show pending approval notice for agents */}
      {userRole === "agent" && profile?.agent_status === "pending_approval" && (
        <Alert className="mb-6">
          <Clock className="h-4 w-4" />
          <AlertTitle>Account Pending Approval</AlertTitle>
          <AlertDescription>
            Your agent account is under review. You can browse the dashboard, but you will not be able to create proposals or access client management until an administrator approves your account. This typically takes 24-48 hours.
          </AlertDescription>
        </Alert>
      )}
      
      {/* Phase 4: New 4-Card Metrics Section */}
      <QueryErrorBoundary>
        <DashboardMetricsByStageCards 
          metrics={metrics || getEmptyMetrics()}
          loading={metricsLoading}
        />
      </QueryErrorBoundary>
      
      {/* Recent Projects Section (unchanged) */}
      <QueryErrorBoundary>
        <div className="grid grid-cols-1 gap-6">
          <RecentProjectsNew 
            proposals={dashboardData?.proposals || []}
            loading={proposalsLoading}
            onRefresh={() => refetchProposals()}
          />
        </div>
      </QueryErrorBoundary>

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

export default Dashboard;
