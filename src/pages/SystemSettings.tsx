
import React from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { CarbonPriceManager } from "@/components/admin/CarbonPriceManager";
import { DataCorrectionManager } from "@/components/admin/DataCorrectionManager";
import { ClientPopulationManager } from "@/components/admin/ClientPopulationManager";
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
        <DataCorrectionManager />
        <ClientPopulationManager />
        <CarbonPriceManager />
      </div>
    </DashboardLayout>
  );
};

export default SystemSettings;
