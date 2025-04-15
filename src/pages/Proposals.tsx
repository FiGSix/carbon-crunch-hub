
import React from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { ProposalsSection } from "@/components/proposals/ProposalsSection";
import { RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

const Proposals = () => {
  const { refreshUser, userRole, user } = useAuth();
  const { toast } = useToast();

  const handleRefreshAuth = async () => {
    try {
      await refreshUser();
      toast({
        title: "Authentication Refreshed",
        description: `User role: ${userRole || 'none'}, User ID: ${user?.id || 'not logged in'}`,
      });
    } catch (error) {
      toast({
        title: "Refresh Failed",
        description: "Failed to refresh authentication status",
        variant: "destructive",
      });
    }
  };

  return (
    <DashboardLayout>
      <DashboardHeader 
        title="Proposals" 
        description="Manage and track all your carbon credit proposals." 
        actions={
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefreshAuth}
            className="ml-auto"
          >
            <RefreshCcw className="h-4 w-4 mr-2" />
            Refresh Auth
          </Button>
        }
      />
      <ProposalsSection />
    </DashboardLayout>
  );
};

export default Proposals;
