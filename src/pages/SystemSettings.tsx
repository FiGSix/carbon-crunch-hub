import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { CarbonRateSetsManager } from "@/components/admin/CarbonRateSetsManager";
import { RegionalSolarYieldManager } from "@/components/admin/RegionalSolarYieldManager";
import { DataCorrectionManager } from "@/components/admin/DataCorrectionManager";
import { ClientPopulationManager } from "@/components/admin/ClientPopulationManager";
import { VintageDeadlineManager } from "@/components/admin/VintageDeadlineManager";
import { GpsBackfillManager } from "@/components/admin/GpsBackfillManager";
import { InverterPortalDefaultsManager } from "@/components/admin/InverterPortalDefaultsManager";
import { SuperPartnerCommissionTiers } from "@/components/admin/SuperPartnerCommissionTiers";
import { useAuth } from "@/contexts/auth";

const SystemSettings = () => {
  const { userRole } = useAuth();

  // Only admins should access this page
  if (userRole !== 'admin') {
    return (
      <DashboardLayout>
        <DashboardHeader 
          title="Access Denied" 
          description="You don't have permission to access this page." 
        />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <DashboardHeader 
        title="System Settings" 
        description="Manage carbon pricing and system configurations." 
      />
      <div className="space-y-6">
        <VintageDeadlineManager />
        <SuperPartnerCommissionTiers />
        <DataCorrectionManager />
        <ClientPopulationManager />
        <RegionalSolarYieldManager />
        <CarbonRateSetsManager />
        <GpsBackfillManager />
        <InverterPortalDefaultsManager />
      </div>
    </DashboardLayout>
  );
};

export default SystemSettings;
