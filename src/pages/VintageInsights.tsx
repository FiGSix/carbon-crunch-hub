import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { VintageProgressDisplayCard } from "@/components/dashboard/VintageProgressDisplayCard";
import { VintageBlendPipelineCard } from "@/components/dashboard/VintageBlendPipelineCard";
import { VintageRevenueBreakdown } from "@/components/dashboard/sections/VintageRevenueBreakdown";
import { VintageCountdown } from "@/components/dashboard/sections/VintageCountdown";

/**
 * Vintage and revenue detail — moved off the dashboard home so the home screen
 * stays a decision screen. Same components, same data, one level deeper.
 */
export default function VintageInsights() {
  return (
    <DashboardLayout>
      <DashboardHeader
        title="Vintage & revenue"
        description="Vintage progress, blend pipeline and estimated revenue for your portfolio."
      />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <VintageProgressDisplayCard />
        <VintageBlendPipelineCard />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <VintageRevenueBreakdown />
        <VintageCountdown />
      </div>
    </DashboardLayout>
  );
}
