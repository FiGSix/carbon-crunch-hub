
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAuth } from "@/contexts/auth";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { RefreshCw, AlertCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { RecentProjectsNew } from "@/components/dashboard/preview/RecentProjectsNew";
import { AgentIntroVideoModal } from "@/components/agent/AgentIntroVideoModal";
import { useAgentIntroVideo } from "@/hooks/useAgentIntroVideo";
import { DashboardMetricsByStageCards } from "@/components/dashboard/sections/DashboardMetricsByStageCards";
import { useCombinedDashboardData } from "@/hooks/dashboard/useCombinedDashboardData";
import { useDashboardHelpers } from "@/hooks/dashboard/useDashboardHelpers";
import { getEmptyMetrics } from "@/hooks/dashboard/useDashboardMetricsByStage";

export default function Dashboard() {
  const { user, userRole, profile } = useAuth();

  // Phase 2 Optimization: Parallel data fetching
  const { 
    metrics: metricsByStage, 
    proposals: recentProposals,
    isLoading, 
    isError,
    errors,
    refetch
  } = useCombinedDashboardData();

  const {
    getWelcomeMessage,
    getUserDisplayName,
    formatUserRole
  } = useDashboardHelpers(refetch);

  const {
    isModalOpen,
    isUpdating,
    markVideoAsViewed,
    skipVideo,
    closeModal
  } = useAgentIntroVideo();

  // Loading state
  if (isLoading && !metricsByStage && !recentProposals) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  // Error state
  if (isError && !metricsByStage && !recentProposals) {
    const errorMessage = errors.length > 0 ? errors[0]?.message : "Failed to load dashboard data";
    
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">{errorMessage}</p>
            <Button 
              variant="outline" 
              size="sm"
              onClick={refetch}
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
            onClick={refetch}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''} text-crunch-yellow`} />
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
      
      {/* Dashboard Content */}
      <DashboardMetricsByStageCards 
        metrics={metricsByStage || getEmptyMetrics()} 
        loading={isLoading}
      />
      
      {/* Recent Projects */}
      <RecentProjectsNew 
        proposals={recentProposals || []} 
        loading={isLoading}
        onRefresh={refetch}
      />

      {/* Global Refresh Button */}
      <div className="flex justify-end mt-6">
        <Button 
          variant="outline"
          onClick={refetch}
          disabled={isLoading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh Data
        </Button>
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
}
