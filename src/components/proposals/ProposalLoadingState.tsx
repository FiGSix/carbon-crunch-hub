
import React from "react";

interface ProposalLoadingStateProps {
  loading: boolean;
  hasProposals: boolean;
}

export function ProposalLoadingState({ loading, hasProposals }: ProposalLoadingStateProps) {
  if (loading) {
    return (
      <div className="text-center py-6">
        <p className="text-carbon-gray-500">Loading proposals...</p>
      </div>
    );
  }
  
  if (!hasProposals) {
    return (
      <div className="text-center py-10">
        <p className="text-carbon-gray-500">No proposals found matching your criteria.</p>
      </div>
    );
  }
  
  return null;
}
