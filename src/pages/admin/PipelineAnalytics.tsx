import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { LearningDashboardSection } from "@/components/dashboard/sections/LearningDashboardSection";
import { VintageRevenueBreakdown } from "@/components/dashboard/sections/VintageRevenueBreakdown";
import { VintageCountdown } from "@/components/dashboard/sections/VintageCountdown";

/**
 * Analytics lives here rather than on Admin home. Admin home is an exception
 * and growth cockpit; this page is where pipeline behaviour is studied.
 */
export default function PipelineAnalytics() {
  return (
    <DashboardLayout requiredRole="admin">
      <DashboardHeader
        title="Pipeline analytics"
        description="What the pipeline is telling us — time to sign, engagement and vintage revenue."
      />
      <LearningDashboardSection />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <VintageRevenueBreakdown />
        <VintageCountdown />
      </div>
    </DashboardLayout>
  );
}
