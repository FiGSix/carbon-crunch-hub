
import React from 'react';
import { ClientAuthWrapper } from './ClientAuthWrapper';

interface ProposalAuthWrapperProps {
  showAuthForm: boolean;
  clientEmail: string | null;
  proposal: { id: string; title: string } | null;
  authRequired: boolean;
  onAuthComplete: () => void;
}

export function ProposalAuthWrapper({
  showAuthForm,
  clientEmail,
  proposal,
  authRequired,
  onAuthComplete
}: ProposalAuthWrapperProps) {
  if (!showAuthForm || !clientEmail || !proposal) {
    return null;
  }

  return (
    <div className="container max-w-5xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold text-center mb-6">
        Authenticate to {authRequired ? 'Take Action on' : 'View'} Proposal
      </h1>
      <p className="text-center mb-8">
        To {authRequired ? 'take action on' : 'view'} the proposal "{proposal.title}", 
        please sign in or create an account.
      </p>
      <ClientAuthWrapper 
        proposalId={proposal.id} 
        clientEmail={clientEmail} 
        onAuthComplete={onAuthComplete}
        requireAuth={authRequired}
      />
    </div>
  );
}
