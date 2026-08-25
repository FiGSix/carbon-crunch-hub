import { useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAuth } from "@/contexts/auth";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { RefreshCw, AlertCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";

import { AgentIntroVideoModal } from "@/components/agent/AgentIntroVideoModal";
import { useAgentIntroVideo } from "@/hooks/useAgentIntroVideo";
import { DashboardMetricsByStageCards } from "@/components/dashboard/sections/DashboardMetricsByStageCards";
import { AgentWarmCards } from "@/components/dashboard/sections/AgentWarmCards";
import { PortfolioReviewSection } from "@/components/dashboard/sections/PortfolioReviewSection";
import { CloseoutQueueSection } from "@/components/dashboard/sections/CloseoutQueueSection";
import { LearningDashboardSection } from "@/components/dashboard/sections/LearningDashboardSection";
import { DashboardTopRow } from "@/components/dashboard/sections/DashboardTopRow";
import { SinceLastVisit } from "@/components/dashboard/SinceLastVisit";
import { NextBestAction } from "@/components/dashboard/NextBestAction";
import { ClientStatusPanel } from "@/components/dashboard/ClientStatusPanel";
import { MilestoneCard } from "@/components/motion/MilestoneCard";
import { useMilestones } from "@/hooks/useMilestones";
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

  // Milestones derived from metrics already on screen — no extra fetching.
  const { milestone, dismiss } = useMilestones({
    userId: user?.id,
    portfolioMwp:
      (metricsByStage?.auditReadyMwp ?? 0) +
      (metricsByStage?.onboardingMwp ?? 0) +
      (metricsByStage?.pendingApprovalMwp ?? 0),
    auditReadyMwp: metricsByStage?.auditReadyMwp ?? 0,
    signedMwp: metricsByStage?.onboardingMwp ?? 0,
    ready: !isLoading && !!metricsByStage,
  });


  
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

  // Loading state — a skeleton shaped like the real dashboard, so the layout
  // stays stable and nothing jumps when data arrives.
  if (isLoading && !metricsByStage) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-16 w-full max-w-md" />
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-32 w-full" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-[168px] w-full rounded-lg" />
            ))}
          </div>
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
      
      {/* Re-entry: what changed since the user was last here (nothing if no delta) */}
      <SinceLastVisit metrics={metricsByStage} userId={user?.id} />

      {/* Quiet achievement: one unseen milestone at a time, dismissible */}
      {milestone && (
        <MilestoneCard milestone={milestone} onDismiss={() => dismiss(milestone.id)} />
      )}

      {/* Client surface: calm status, one action only when something is required */}
      {userRole === "client" && (
        <ClientStatusPanel metrics={metricsByStage} loading={isLoading} />
      )}

      {/* Agent Engine — flagship section */}
      {(userRole === "agent" || userRole === "admin") && (
        <>
          {/* The single strongest CTA on the page: one ranked action */}
          <NextBestAction />

          {/* Warm cards: full-width, the single most actionable surface */}
          <AgentWarmCards limit={5} />

          {/* Secondary action lists side-by-side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-2">
            <PortfolioReviewSection limit={4} />
            <CloseoutQueueSection limit={5} />
          </div>

          {/* Learning dashboard: admin-only — aggregate KPIs aren't daily-actionable for agents */}
          {userRole === "admin" && <LearningDashboardSection />}
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
