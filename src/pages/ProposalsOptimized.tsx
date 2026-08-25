
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ProposalsPageOptimized } from "@/components/proposals/ProposalsPageOptimized";
import { CloseoutQueueSection } from "@/components/dashboard/sections/CloseoutQueueSection";
import { useAuth } from "@/contexts/auth";

export default function ProposalsOptimized() {
  const { userRole } = useAuth();
  const canArchive = userRole === "agent" || userRole === "admin";

  return (
    <DashboardLayout>
      <ProposalsPageOptimized />
      {/* Pipeline hygiene lives with the proposals it archives, not on the dashboard. */}
      {canArchive && (
        <div className="mt-8">
          <CloseoutQueueSection limit={5} />
        </div>
      )}
    </DashboardLayout>
  );
}
