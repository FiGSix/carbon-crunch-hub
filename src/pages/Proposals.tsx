
import React from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { ProposalsSection } from "@/components/proposals/ProposalsSection";
import { useAuth } from "@/contexts/auth";

const Proposals = () => {
  const { userRole } = useAuth();
  
  // Set up appropriate titles and descriptions based on user role
  const pageTitle = userRole === 'client' 
    ? 'My Proposals' 
    : userRole === 'agent' 
      ? 'My Proposals' 
      : 'Proposals';
      
  const pageDescription = userRole === 'client'
    ? "View and manage proposals for your solar installations."
    : userRole === 'agent'
      ? "Manage and track proposals assigned to you."
      : "Manage and track all carbon credit proposals.";

  return (
    <DashboardLayout>
      <DashboardHeader 
        title={pageTitle} 
        description={pageDescription} 
      />
      <ProposalsSection />
    </DashboardLayout>
  );
};

export default Proposals;
