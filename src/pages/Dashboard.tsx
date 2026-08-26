import { useEffect } from "react";
import { Link, Navigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAuth } from "@/contexts/auth";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { RefreshCw, AlertCircle, Clock, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";

import { AgentIntroVideoModal } from "@/components/agent/AgentIntroVideoModal";
import { useAgentIntroVideo } from "@/hooks/useAgentIntroVideo";
import { SinceLastVisit } from "@/components/dashboard/SinceLastVisit";
import { ClientStatusPanel } from "@/components/dashboard/ClientStatusPanel";
import { VintageProgressDisplayCard } from "@/components/dashboard/VintageProgressDisplayCard";
import { PortfolioHero } from "@/components/dashboard/v2/PortfolioHero";
import { PipelineFunnel } from "@/components/dashboard/v2/PipelineFunnel";
import { AttentionRequired } from "@/components/dashboard/v2/AttentionRequired";
import { PartnerNetwork } from "@/components/dashboard/v2/PartnerNetwork";
import { AdminExceptions } from "@/components/dashboard/v2/AdminExceptions";
import { MilestoneCard } from "@/components/motion/MilestoneCard";
import { useMilestones } from "@/hooks/useMilestones";
import { useDashboardMetricsByStage } from "@/hooks/dashboard/useDashboardMetricsByStage";
import { useClientOnboardingActions } from "@/hooks/dashboard/useClientOnboardingActions";
import { useDashboardHelpers } from "@/hooks/dashboard/useDashboardHelpers";
import { useToast } from "@/hooks/use-toast";

const fmtMwp2 = (n: number) => n.toFixed(2);
const fmtRand = (n: number) => `R ${Math.round(n).toLocaleString("en-ZA")}`;

export default function Dashboard() {
  const { user, userRole, profile } = useAuth();
  const { toast } = useToast();

  const {
    data: metricsByStage,
    isLoading,
    isError,
    refetch,
  } = useDashboardMetricsByStage();

  const {
    data: clientOnboardingState,
    isLoading: isClientOnboardingLoading,
  } = useClientOnboardingActions();

  const { getWelcomeMessage, getUserDisplayName, formatUserRole } =
    useDashboardHelpers(() => refetch());

  const { isModalOpen, isUpdating, markVideoAsViewed, skipVideo, closeModal } =
    useAgentIntroVideo();

  const auditReadyMwp = metricsByStage?.auditReadyMwp ?? 0;
  const onboardingMwp = metricsByStage?.onboardingMwp ?? 0;
  const pendingMwp = metricsByStage?.pendingApprovalMwp ?? 0;
  const portfolioMwp = auditReadyMwp + onboardingMwp + pendingMwp;

  const { milestone, dismiss } = useMilestones({
    userId: user?.id,
    portfolioMwp,
    auditReadyMwp,
    signedMwp: onboardingMwp,
    ready: !isLoading && !!metricsByStage,
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("auth") === "success" && params.get("proposal")) {
      toast({
        title: "Registration successful!",
        description:
          "Your account has been created. You can now view and respond to your proposal.",
      });
      window.history.replaceState({}, "", "/dashboard");
    }
  }, [toast]);

  // Super Partners have their own dashboard — never render the generic one for them.
  // Suspended Super Partners are blocked from SP routes, so they stay here.
  if (userRole === "super_partner" && profile?.super_partner_status !== "suspended") {
    return <Navigate to="/super-partner/dashboard" replace />;
  }

  if (isLoading && !metricsByStage) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-16 w-full max-w-md" />
          <Skeleton className="h-40 w-full rounded-xl" />
          <Skeleton className="h-44 w-full rounded-lg" />
          <Skeleton className="h-40 w-full rounded-lg" />
        </div>
      </DashboardLayout>
    );
  }

  if (isError && !metricsByStage) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">
              Failed to load dashboard metrics
            </p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const isAdmin = userRole === "admin";
  const isAgent = userRole === "agent";
  const isClient = userRole === "client";

  const funnelStages = [
    {
      label: "Proposal — awaiting signature",
      mwp: pendingMwp,
      revenue: metricsByStage?.pendingApprovalRevenue,
      to: "/proposals",
      tone: "pending" as const,
    },
    {
      label: "Signed / onboarding",
      mwp: onboardingMwp,
      revenue: metricsByStage?.onboardingRevenue,
      to: "/onboarding",
      tone: "signed" as const,
    },
    {
      label: "Audit Ready",
      mwp: auditReadyMwp,
      revenue: metricsByStage?.auditReadyRevenue,
      to: "/onboarding?status=audit_ready",
      tone: "ready" as const,
    },
  ];

  return (
    <DashboardLayout>
      {isAdmin ? (
        <DashboardHeader
          title="Dashboard"
          description="Platform performance and actions requiring attention."
        />
      ) : (
        <DashboardHeader
          title="Dashboard"
          description={getWelcomeMessage()}
          userName={getUserDisplayName()}
          userRole={formatUserRole(userRole)}
        />
      )}


      {isAgent && profile?.agent_status === "pending_approval" && (
        <Alert className="mb-6">
          <Clock className="h-4 w-4" />
          <AlertTitle>Account Pending Approval</AlertTitle>
          <AlertDescription>
            Your partner account is under review. You can browse the dashboard,
            but you will not be able to create proposals or access client
            management until an administrator approves your account.
          </AlertDescription>
        </Alert>
      )}

      {/* CLIENT — status, progress, value. Nothing commercial or partner-facing. */}
      {isClient && (
        <>
          <ClientStatusPanel
            metrics={metricsByStage}
            loading={isLoading}
            onboardingState={clientOnboardingState}
            onboardingLoading={isClientOnboardingLoading}
          />
          <SinceLastVisit metrics={metricsByStage} userId={user?.id} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <VintageProgressDisplayCard />
            <div className="rounded-lg border bg-card p-5">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Your carbon portfolio
              </p>
              <p className="mt-1 text-3xl font-bold">
                {portfolioMwp > 0 ? `${fmtMwp2(portfolioMwp)} MWp` : "No data yet"}
              </p>
              {auditReadyMwp > 0 && (
                <p className="mt-2 text-sm text-muted-foreground">
                  {fmtMwp2(auditReadyMwp)} MWp Audit Ready ·{" "}
                  {fmtRand(metricsByStage?.auditReadyRevenue ?? 0)} est. 2025–2030
                </p>
              )}
              <Button asChild variant="outline" size="sm" className="mt-4">
                <Link to="/onboarding">
                  View my projects
                  <ArrowRight className="ml-1.5 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </>
      )}

      {/* PARTNER — portfolio hero, one attention layer, one funnel. */}
      {isAgent && (
        <>
          <PortfolioHero
            label="Your portfolio"
            mwp={portfolioMwp}
            caption={
              portfolioMwp > 0
                ? "Everything you've brought onto Crunch Carbon."
                : "Create your first proposal to start building your portfolio."
            }
            figures={[
              {
                label: "Audit Ready",
                value: `${fmtMwp2(auditReadyMwp)} MWp`,
                numericValue: auditReadyMwp,
                format: (n) => `${n.toFixed(2)} MWp`,
              },
              {
                label: "Signed, onboarding",
                value: `${fmtMwp2(onboardingMwp)} MWp`,
                numericValue: onboardingMwp,
                format: (n) => `${n.toFixed(2)} MWp`,
              },
              {
                label: "Active proposals",
                value: `${fmtMwp2(pendingMwp)} MWp`,
                numericValue: pendingMwp,
                format: (n) => `${n.toFixed(2)} MWp`,
              },
              {
                label: "Audit review requests",
                value: String(metricsByStage?.auditReviewRequests ?? 0),
                numericValue: metricsByStage?.auditReviewRequests ?? 0,
              },
            ]}
          />
          <SinceLastVisit metrics={metricsByStage} userId={user?.id} />
          {milestone && (
            <MilestoneCard milestone={milestone} onDismiss={() => dismiss(milestone.id)} />
          )}
          <AttentionRequired limit={3} />
          <PipelineFunnel
            stages={funnelStages}
            subtitle="Hover a stage for estimated revenue; select one to open the records behind it."
          />
        </>
      )}

      {/* ADMIN — pipeline, exceptions, funnel, partner network. */}
      {isAdmin && (
        <>
          <PortfolioHero
            dense
            label="Platform pipeline"
            mwp={portfolioMwp}
            caption="All qualifying MWp across proposal, signed/onboarding and Audit Ready. Proposal-stage MWp is not yet contracted."
            figures={[
              {
                label: "Proposal",
                value: `${fmtMwp2(pendingMwp)} MWp`,
                numericValue: pendingMwp,
                format: (n) => `${n.toFixed(2)} MWp`,
              },
              {
                label: "Signed / onboarding",
                value: `${fmtMwp2(onboardingMwp)} MWp`,
                numericValue: onboardingMwp,
                format: (n) => `${n.toFixed(2)} MWp`,
              },
              {
                label: "Audit Ready",
                value: `${fmtMwp2(auditReadyMwp)} MWp`,
                numericValue: auditReadyMwp,
                format: (n) => `${n.toFixed(2)} MWp`,
              },
              {
                label: "Audit Ready value",
                value: fmtRand(metricsByStage?.auditReadyRevenue ?? 0),
                numericValue: metricsByStage?.auditReadyRevenue ?? 0,
                format: fmtRand,
              },
            ]}
          />
          <SinceLastVisit metrics={metricsByStage} userId={user?.id} />
          <AdminExceptions />
          <PipelineFunnel
            title="Commercial funnel"
            stages={funnelStages}
            subtitle="Where platform MWp currently sits, and how much carries through to the next stage. Hover for estimated revenue; select a stage to open the records behind it."
          />
          <PartnerNetwork />
          <nav className="mb-8 flex flex-wrap items-center gap-x-4 gap-y-2 border-t pt-4 text-sm">
            <Link
              to="/admin/analytics"
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              Pipeline analytics
            </Link>
            <Link
              to="/onboarding"
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              Project onboarding
            </Link>
            <Link
              to="/admin/partners"
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              Partner management
            </Link>
          </nav>
        </>
      )}

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
