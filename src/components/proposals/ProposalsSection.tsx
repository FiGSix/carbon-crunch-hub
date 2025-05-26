
import React, { useEffect, useCallback, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, RefreshCw, Users } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProposalList } from "@/components/proposals/ProposalList";
import { ProposalFilters } from "@/components/proposals/ProposalFilters";
import { ProposalActions } from "@/components/proposals/ProposalActions";
import { ProposalLoadingState } from "@/components/proposals/ProposalLoadingState";
import { TokenTester } from "@/components/proposals/test/TokenTester";
import { ClientsTable } from "@/components/clients/ClientsTable";
import { ExportButton } from "@/components/clients/ExportButton";
import { useProposals } from "@/hooks/useProposals";
import { useMyClients } from "@/hooks/useMyClients";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth";
import { useToast } from "@/hooks/use-toast";
import { clearProposalsCache } from "@/hooks/proposals/utils/proposalCache";

export function ProposalsSection() {
  const { 
    proposals, 
    loading, 
    error,
    handleFilterChange, 
    fetchProposals 
  } = useProposals();
  
  const { clients, isLoading: clientsLoading, error: clientsError } = useMyClients();
  const { user, userRole } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("proposals");
  
  // Log auth state on mount for debugging
  useEffect(() => {
    console.log("ProposalsSection - Auth state:", { 
      isAuthenticated: !!user,
      userId: user?.id, 
      userRole,
      proposalsCount: proposals.length,
      clientsCount: clients.length
    });
  }, [user, userRole, proposals.length, clients.length]);
  
  // Memoize titles based on user role to prevent re-renders
  const sectionTitles = useMemo(() => ({
    proposals: userRole === 'agent' ? 'My Assigned Proposals' : 
               userRole === 'client' ? 'My Proposals' : 'Proposal Management',
    clients: userRole === 'admin' ? 'All Clients' : 'My Clients'
  }), [userRole]);
  
  // Optimize proposal update handler with useCallback
  const handleProposalUpdate = useCallback(() => {
    console.log("Proposal update triggered - refreshing proposals list");
    clearProposalsCache(); // Clear cache to force refresh
    fetchProposals();
  }, [fetchProposals]);
  
  // Listen for global proposal status change events
  useEffect(() => {
    const handleProposalStatusChange = (event: Event) => {
      // Cast event to CustomEvent to access detail property
      const customEvent = event as CustomEvent<{id: string, status: string}>;
      console.log("ProposalsSection detected status change event:", customEvent.detail);
      
      // Show toast notification based on the new status
      if (customEvent.detail.status === 'approved') {
        toast({
          title: "Proposal Approved",
          description: "The proposal has been approved successfully.",
        });
      } else if (customEvent.detail.status === 'rejected') {
        toast({
          title: "Proposal Rejected",
          description: "The proposal has been rejected.",
        });
      }
      
      // Don't need to call fetchProposals here - handled by the event listener in useProposals
    };
    
    window.addEventListener('proposal-status-changed', handleProposalStatusChange as EventListener);
    
    return () => {
      window.removeEventListener('proposal-status-changed', handleProposalStatusChange as EventListener);
    };
  }, [toast]);
  
  return (
    <>
      <Card className="retro-card mb-8">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center">
              {activeTab === "proposals" ? (
                <>
                  <FileText className="h-5 w-5 mr-2" />
                  {sectionTitles.proposals}
                </>
              ) : (
                <>
                  <Users className="h-5 w-5 mr-2" />
                  {sectionTitles.clients}
                </>
              )}
            </div>
            <div className="flex items-center gap-2">
              {activeTab === "clients" && userRole === 'admin' && clients.length > 0 && (
                <ExportButton clients={clients} />
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={activeTab === "proposals" ? handleProposalUpdate : () => window.location.reload()}
                disabled={activeTab === "proposals" ? loading : clientsLoading}
                className="ml-auto"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${(activeTab === "proposals" ? loading : clientsLoading) ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="proposals" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Proposals
              </TabsTrigger>
              <TabsTrigger value="clients" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Clients
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="proposals" className="mt-6">
              <ProposalActions />
              <ProposalFilters 
                onSearchChange={(value) => handleFilterChange('search', value)}
                onStatusChange={(value) => handleFilterChange('status', value)}
                onSortChange={(value) => handleFilterChange('sort', value)}
              />
              
              {error && (
                <Alert variant="destructive" className="my-4">
                  <AlertTitle>Error Loading Proposals</AlertTitle>
                  <AlertDescription className="flex flex-col gap-2">
                    <p>{error}</p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="self-start"
                      onClick={() => fetchProposals()}
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Retry
                    </Button>
                  </AlertDescription>
                </Alert>
              )}
              
              <ProposalLoadingState 
                loading={loading} 
                hasProposals={proposals.length > 0} 
              />
              
              {!loading && proposals.length > 0 && (
                <ProposalList 
                  proposals={proposals} 
                  onProposalUpdate={handleProposalUpdate}
                />
              )}
            </TabsContent>
            
            <TabsContent value="clients" className="mt-6">
              <ClientsTable 
                clients={clients}
                isLoading={clientsLoading}
                error={clientsError}
                isAdmin={userRole === 'admin'}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      
      {/* Debug Token Tester - Only show for agents */}
      {userRole === 'agent' && (
        <Card className="retro-card mb-8">
          <CardHeader>
            <CardTitle>Debug: Token Tester</CardTitle>
          </CardHeader>
          <CardContent>
            <TokenTester />
          </CardContent>
        </Card>
      )}
    </>
  );
}
