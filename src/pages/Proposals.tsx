
import React from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { ProposalsSection } from "@/components/proposals/ProposalsSection";
import { RefreshCcw, Bug } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

const Proposals = () => {
  const { refreshUser, userRole, user, debugAuthState } = useAuth();
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
  
  const handleDebugAuth = async () => {
    try {
      const debugInfo = await debugAuthState();
      console.log("Auth debug information:", debugInfo);
      toast({
        title: "Auth Debug Info",
        description: "Check console for detailed auth information",
      });
    } catch (error) {
      console.error("Error getting debug info:", error);
    }
  };

  return (
    <DashboardLayout>
      <DashboardHeader 
        title="Proposals" 
        description="Manage and track all your carbon credit proposals." 
        actions={
          <div className="flex flex-row gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleDebugAuth}
              className="ml-auto"
            >
              <Bug className="h-4 w-4 mr-2" />
              Debug Auth
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRefreshAuth}
            >
              <RefreshCcw className="h-4 w-4 mr-2" />
              Refresh Auth
            </Button>
          </div>
        }
      />
      <ProposalsSection />
    </DashboardLayout>
  );
};

export default Proposals;
