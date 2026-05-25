import { useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAuth } from "@/contexts/auth";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { RefreshCw, AlertCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AgentIntroVideoModal } from "@/components/agent/AgentIntroVideoModal";
import { useAgentIntroVideo } from "@/hooks/useAgentIntroVideo";
import { DashboardMetricsByStageCards } from "@/components/dashboard/sections/DashboardMetricsByStageCards";
import { AgentWarmCards } from "@/components/dashboard/sections/AgentWarmCards";
import { PortfolioReviewSection } from "@/components/dashboard/sections/PortfolioReviewSection";
import { CloseoutQueueSection } from "@/components/dashboard/sections/CloseoutQueueSection";
import { LearningDashboardSection } from "@/components/dashboard/sections/LearningDashboardSection";
import { DashboardTopRow } from "@/components/dashboard/sections/DashboardTopRow";
import { useDashboardMetricsByStage, getEmptyMetrics } from "@/hooks/dashboard/useDashboardMetricsByStage";
import { useDashboardHelpers } from "@/hooks/dashboard/useDashboardHelpers";
import { useToast } from "@/hooks/use-toast";

export default function Dashboard() {
  const { user, userRole, profile } = useAuth();
  const { toast } = useToast();

  // Fetch dashboard metrics by stage
  const { 
    data: metricsByStage, 
    isLoading, 
    isError,
    refetch 
  } = useDashboardMetricsByStage();

  const {
    getWelcomeMessage,
    getUserDisplayName,
    formatUserRole
  } = useDashboardHelpers(() => refetch());

  const {
    isModalOpen,
    isUpdating,
    markVideoAsViewed,
    skipVideo,
    closeModal
  } = useAgentIntroVideo();
  
  // Phase 4: Add success message handler for post-registration redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const authSuccess = params.get('auth');
    const proposalId = params.get('proposal');
    
    if (authSuccess === 'success' && proposalId) {
      toast({
        title: "Registration successful!",
        description: "Your account has been created. You can now view and respond to your proposal.",
      });
      
      // Clean up URL
      window.history.replaceState({}, '', '/dashboard');
    }
  }, [toast]);

  // Loading state
  if (isLoading && !metricsByStage) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  // Error state
  if (isError && !metricsByStage) {
    const errorMessage = "Failed to load dashboard metrics";
    
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">{errorMessage}</p>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => refetch()}
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
            onClick={() => refetch()}
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
      
      {/* Agent Engine — flagship section */}
      {(userRole === "agent" || userRole === "admin") && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-2">
            <div className="lg:col-span-2">
              <AgentWarmCards />
            </div>
            <div className="lg:col-span-1 space-y-4">
              <PortfolioReviewSection />
              <CloseoutQueueSection />
            </div>
          </div>
          <LearningDashboardSection />
        </>
      )}

      {/* TOP ROW: Combined grid with Placeholder Cards and Countdown */}
      <DashboardTopRow 
        loading={isLoading} 
        metrics={metricsByStage}
        userRole={userRole}
      />
      
      {/* BOTTOM ROW: Metric Cards */}
      <DashboardMetricsByStageCards 
        metrics={metricsByStage || getEmptyMetrics()} 
        loading={isLoading}
      />

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
