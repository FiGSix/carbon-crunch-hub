import { memo } from "react";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { CheckCircle, DollarSign, Clock, FileText } from "lucide-react";
import { DashboardMetricsByStage } from "@/hooks/dashboard/types";

interface DashboardMetricsByStageCardsProps {
  metrics: DashboardMetricsByStage;
  loading?: boolean;
}

/**
 * Phase 4: Dashboard Metrics by Stage Cards Component
 * 
 * Displays 4 key metrics for the dashboard:
 * 1. Audit Ready Projects - Total MWp of projects ready for audit
 * 2. Total Revenue (2025-2030) - Revenue from audit-ready projects
 * 3. Onboarding Projects - Total MWp of projects in onboarding
 * 4. Proposals Pending - Total MWp of proposals awaiting approval
 * 
 * Features:
 * - Responsive grid layout (1 col mobile, 2 cols tablet, 4 cols desktop)
 * - Consistent styling with existing dashboard cards
 * - Loading state support
 * - Formatted values with proper units
 */
function DashboardMetricsByStageCardsComponent({
  metrics,
  loading = false
}: DashboardMetricsByStageCardsProps) {
  
  /**
   * Format MWp values to 3 decimal places
   */
  const formatMwp = (value: number): string => {
    if (loading) return "...";
    return `${value.toFixed(3)} MWp`;
  };

  /**
   * Format revenue in South African Rands
   */
  const formatRevenue = (value: number): string => {
    if (loading) return "...";
    return `R ${value.toLocaleString('en-ZA', { 
      minimumFractionDigits: 0,
      maximumFractionDigits: 0 
    })}`;
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {/* Card 1: Audit Ready Projects */}
      <StatsCard 
        title="Audit Ready Projects" 
        value={formatMwp(metrics.auditReadyMwp)} 
        icon={<CheckCircle className="h-5 w-5" />}
        color="green"
      />
      
      {/* Card 2: Total Revenue (2025-2030) */}
      <StatsCard 
        title="Total Revenue (2025-2030)" 
        value={formatRevenue(metrics.auditReadyRevenue)} 
        icon={<DollarSign className="h-5 w-5" />}
        color="yellow"
      />
      
      {/* Card 3: Onboarding Projects */}
      <StatsCard 
        title="Onboarding Projects" 
        value={formatMwp(metrics.onboardingMwp)} 
        icon={<Clock className="h-5 w-5" />}
        color="blue"
      />
      
      {/* Card 4: Proposals Pending */}
      <StatsCard 
        title="Proposal(s) Pending" 
        value={formatMwp(metrics.pendingApprovalMwp)} 
        icon={<FileText className="h-5 w-5" />}
        color="emerald"
      />
    </div>
  );
}

export const DashboardMetricsByStageCards = memo(DashboardMetricsByStageCardsComponent);
