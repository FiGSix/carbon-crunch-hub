import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Plus, ExternalLink } from "lucide-react";
import { PartnerInvitationDialog } from "@/components/admin/partners/PartnerInvitationDialog";
import { PendingPartnersTable } from "@/components/admin/partners/PendingPartnersTable";
import { ActivePartnersTable } from "@/components/admin/partners/ActivePartnersTable";
import { PartnerUsageStats } from "@/components/admin/partners/PartnerUsageStats";

export default function PartnerManagement() {
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleInvitationSuccess = () => {
    setRefreshKey(prev => prev + 1);
    setInviteDialogOpen(false);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <DashboardHeader
          title="Partner API Management"
          description="Invite and manage third-party API integrations"
        />

        <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
          <Button onClick={() => setInviteDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Invite Partner
          </Button>
          <Button variant="outline" asChild>
            <a 
              href="https://uyjryuopuqgmsvayiccl.supabase.co/functions/v1/partner-api/v1/openapi.json" 
              target="_blank" 
              rel="noopener noreferrer"
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              API Documentation
            </a>
          </Button>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Partner Overview</CardTitle>
            <CardDescription>
              Manage partner invitations, API keys, and monitor usage
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="pending" className="w-full">
              <TabsList className="grid w-full grid-cols-3 max-w-md">
                <TabsTrigger value="pending">Pending</TabsTrigger>
                <TabsTrigger value="active">Active</TabsTrigger>
                <TabsTrigger value="usage">Usage Stats</TabsTrigger>
              </TabsList>
              
              <TabsContent value="pending" className="mt-6">
                <PendingPartnersTable key={`pending-${refreshKey}`} onRefresh={() => setRefreshKey(prev => prev + 1)} />
              </TabsContent>
              
              <TabsContent value="active" className="mt-6">
                <ActivePartnersTable key={`active-${refreshKey}`} onRefresh={() => setRefreshKey(prev => prev + 1)} />
              </TabsContent>
              
              <TabsContent value="usage" className="mt-6">
                <PartnerUsageStats key={`usage-${refreshKey}`} />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      <PartnerInvitationDialog 
        open={inviteDialogOpen} 
        onOpenChange={setInviteDialogOpen}
        onSuccess={handleInvitationSuccess}
      />
    </DashboardLayout>
  );
}
