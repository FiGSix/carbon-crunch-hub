
import React from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { ProposalsSection } from "@/components/proposals/ProposalsSection";

const Proposals = () => {
  return (
    <DashboardLayout>
      <DashboardHeader 
        title="Proposals" 
        description="Manage and track all your carbon credit proposals." 
      />
      <ProposalsSection />
    </DashboardLayout>
  );
};

export default Proposals;
