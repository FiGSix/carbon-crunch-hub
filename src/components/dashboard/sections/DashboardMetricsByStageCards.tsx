import { memo, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle, DollarSign, Clock, FileText } from "lucide-react";
import { DashboardMetricsByStage } from "@/hooks/dashboard/types";

interface DashboardMetricsByStageCardsProps {
  metrics: DashboardMetricsByStage;
  loading?: boolean;
}

const formatMwp = (value: number) => `${value.toFixed(3)} MWp`;

const formatRevenue = (value: number) =>
  `R ${Math.round(value).toLocaleString("en-ZA", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;

/**
 * Stage metrics — the quiet layer of the dashboard.
 *
 * Values count to their target so a change is noticeable; detail and an action
 * affordance appear on hover so the cards stay clean at rest; each card is a
 * one-click path from the insight to the list it describes.
 */
function DashboardMetricsByStageCardsComponent({
  metrics,
  loading = false,
}: DashboardMetricsByStageCardsProps) {
  const navigate = useNavigate();

  // Detect a rise in Audit Ready MWp within the session — the one moment that
  // earns a little more emphasis than a routine update.
  const previousAuditReady = useRef<number | null>(null);
  const auditReadyRose = useRef(false);

  useEffect(() => {
    if (loading) return;
    const prev = previousAuditReady.current;
    auditReadyRose.current = prev !== null && metrics.auditReadyMwp > prev + 0.0005;
    previousAuditReady.current = metrics.auditReadyMwp;
  }, [metrics.auditReadyMwp, loading]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6 mb-8">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-[168px] w-full rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6 mb-8">
      <StatsCard
        title="Proposal(s) Pending"
        value={formatMwp(metrics.pendingApprovalMwp)}
        numericValue={metrics.pendingApprovalMwp}
        formatValue={formatMwp}
        icon={<FileText className="h-5 w-5" />}
        color="red"
        hoverDetail="Awaiting client acceptance"
        actionLabel="Review proposals"
        onClick={() => navigate("/proposals")}
      />

      <StatsCard
        title="Proposal(s) Pending Est. Revenue (2025-2030)"
        value={formatRevenue(metrics.pendingApprovalRevenue)}
        numericValue={metrics.pendingApprovalRevenue}
        formatValue={formatRevenue}
        icon={<DollarSign className="h-5 w-5" />}
        color="red"
        hoverDetail="Value at stake if these are signed"
        actionLabel="Review proposals"
        onClick={() => navigate("/proposals")}
      />

      <StatsCard
        title="Signed Project(s)"
        value={formatMwp(metrics.onboardingMwp)}
        numericValue={metrics.onboardingMwp}
        formatValue={formatMwp}
        icon={<Clock className="h-5 w-5" />}
        color="yellow"
        hoverDetail="Signed and moving through onboarding"
        actionLabel="Open onboarding"
        onClick={() => navigate("/onboarding")}
      />

      <StatsCard
        title="Signed Project(s) Est. Revenue (2025-2030)"
        value={formatRevenue(metrics.onboardingRevenue)}
        numericValue={metrics.onboardingRevenue}
        formatValue={formatRevenue}
        icon={<DollarSign className="h-5 w-5" />}
        color="yellow"
        hoverDetail="Locked in, pending onboarding completion"
        actionLabel="Open onboarding"
        onClick={() => navigate("/onboarding")}
      />

      <StatsCard
        title="Vintage 2025 Audit Ready Projects"
        value={formatMwp(metrics.auditReadyMwp)}
        numericValue={metrics.auditReadyMwp}
        formatValue={formatMwp}
        icon={<CheckCircle className="h-5 w-5" />}
        color="green"
        hoverDetail="Onboarding complete, ready for audit"
        actionLabel="View audit-ready projects"
        onClick={() => navigate("/onboarding?status=audit_ready")}
        sweep={auditReadyRose.current}
      />

      <StatsCard
        title="Vintage 2025 Est. Revenue (2025-2030)"
        value={formatRevenue(metrics.auditReadyRevenue)}
        numericValue={metrics.auditReadyRevenue}
        formatValue={formatRevenue}
        icon={<DollarSign className="h-5 w-5" />}
        color="green"
        hoverDetail="Revenue from your audit-ready portfolio"
        actionLabel="View audit-ready projects"
        onClick={() => navigate("/onboarding?status=audit_ready")}
      />
    </div>
  );
}

export const DashboardMetricsByStageCards = memo(DashboardMetricsByStageCardsComponent);
