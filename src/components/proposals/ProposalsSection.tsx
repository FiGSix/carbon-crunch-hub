
import React, { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText } from "lucide-react";
import { ProposalList } from "@/components/proposals/ProposalList";
import { ProposalFilters } from "@/components/proposals/ProposalFilters";
import { ProposalActions } from "@/components/proposals/ProposalActions";
import { ProposalLoadingState } from "@/components/proposals/ProposalLoadingState";
import { useProposals } from "@/hooks/useProposals";

export function ProposalsSection() {
  const { 
    proposals, 
    loading, 
    handleFilterChange, 
    fetchProposals 
  } = useProposals();
  
  useEffect(() => {
    fetchProposals();
  }, [fetchProposals]);
  
  return (
    <Card className="retro-card mb-8">
      <CardHeader>
        <CardTitle className="flex items-center">
          <FileText className="h-5 w-5 mr-2" />
          Proposal Management
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ProposalActions />
        <ProposalFilters 
          onSearchChange={(value) => handleFilterChange('search', value)}
          onStatusChange={(value) => handleFilterChange('status', value)}
          onSortChange={(value) => handleFilterChange('sort', value)}
        />
        <ProposalLoadingState 
          loading={loading} 
          hasProposals={proposals.length > 0} 
        />
        {!loading && proposals.length > 0 && (
          <ProposalList 
            proposals={proposals} 
            onProposalUpdate={fetchProposals}
          />
        )}
      </CardContent>
    </Card>
  );
}
