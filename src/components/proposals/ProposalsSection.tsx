
import React, { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, RefreshCw } from "lucide-react";
import { ProposalList } from "@/components/proposals/ProposalList";
import { ProposalFilters } from "@/components/proposals/ProposalFilters";
import { ProposalActions } from "@/components/proposals/ProposalActions";
import { ProposalLoadingState } from "@/components/proposals/ProposalLoadingState";
import { useProposals } from "@/hooks/useProposals";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth";

export function ProposalsSection() {
  const { 
    proposals, 
    loading, 
    error,
    handleFilterChange, 
    fetchProposals 
  } = useProposals();
  
  const { user, userRole } = useAuth();
  
  // Log auth state on mount for debugging
  useEffect(() => {
    console.log("ProposalsSection - Auth state:", { 
      isAuthenticated: !!user,
      userId: user?.id, 
      userRole,
      proposalsCount: proposals.length
    });
  }, [user, userRole, proposals.length]);
  
  const handleProposalUpdate = () => {
    console.log("Proposal update triggered - refreshing proposals list");
    fetchProposals();
  };
  
  return (
    <Card className="retro-card mb-8">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center">
            <FileText className="h-5 w-5 mr-2" />
            {userRole === 'agent' ? 'My Assigned Proposals' : 'Proposal Management'}
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
  );
}
