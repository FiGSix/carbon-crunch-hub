
import React from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { ProposalInvitationTester } from "@/components/proposals/test/ProposalInvitationTester";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { InfoIcon } from "lucide-react";

const TestInvitations = () => {
  return (
    <DashboardLayout>
      <DashboardHeader 
        title="Invitation Testing" 
        description="Test and validate the proposal invitation system." 
      />
      
      <Alert className="mb-6">
        <InfoIcon className="h-4 w-4" />
        <AlertTitle>Development Only</AlertTitle>
        <AlertDescription>
          This page is intended for development and testing purposes only. It allows you to verify that the proposal invitation system is working correctly.
        </AlertDescription>
      </Alert>
      
      <ProposalInvitationTester />
    </DashboardLayout>
  );
};

export default TestInvitations;
