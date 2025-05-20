
import React from 'react';

interface ProposalErrorProps {
  errorMessage: string;
}

export function ProposalError({ errorMessage }: ProposalErrorProps) {
  return (
    <div className="container max-w-5xl mx-auto px-4 py-12">
      <div className="bg-red-50 border border-red-300 rounded-lg p-6 text-center">
        <h2 className="text-xl font-semibold text-red-700 mb-2">Error Loading Proposal</h2>
        <p className="text-red-600">{errorMessage}</p>
      </div>
    </div>
  );
}
