
import React, { useEffect, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, RefreshCw } from "lucide-react";
import { ProposalList } from "@/components/proposals/ProposalList";
import { ProposalFilters } from "@/components/proposals/ProposalFilters";
import { ProposalActions } from "@/components/proposals/ProposalActions";
import { ProposalLoadingState } from "@/components/proposals/ProposalLoadingState";
import { PortfolioManagement } from "@/components/proposals/PortfolioManagement";
import { useProposals } from "@/hooks/useProposals";
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
  
  const { user, userRole } = useAuth();
  const { toast } = useToast();
  
  // Log auth state on mount for debugging
  useEffect(() => {
    console.log("ProposalsSection - Auth state:", { 
      isAuthenticated: !!user,
      userId: user?.id, 
      userRole,
      proposalsCount: proposals.length
    });
  }, [user, userRole, proposals.length]);
  
  // Memoize title based on user role to prevent re-renders
  const sectionTitle = useMemo(() => {
    if (userRole === 'agent') return 'My Proposals';
    if (userRole === 'client') return 'My Proposals';
    return 'Proposal Management';
  }, [userRole]);
  
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
      const customEvent = event as CustomEvent<{id?: string, status?: string, type?: string, clientId?: string}>;
      console.log("ProposalsSection detected status change event:", customEvent.detail);
      
      // Show toast notification based on the event type
      if (customEvent.detail.type === 'portfolio-update') {
        toast({
          title: "Portfolio Updated",
          description: "Client portfolio percentages have been recalculated.",
        });
      } else if (customEvent.detail.type === 'portfolio-validation-complete') {
        toast({
          title: "Portfolio Validation Complete",
          description: "All portfolio inconsistencies have been checked and fixed.",
        });
      } else if (customEvent.detail.status === 'approved') {
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
      <PortfolioManagement />
      
      <Card className="retro-card mb-8">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center">
              <FileText className="h-5 w-5 mr-2" />
              {sectionTitle}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleProposalUpdate}
              disabled={loading}
              className="ml-auto"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>
    </>
  );
}
