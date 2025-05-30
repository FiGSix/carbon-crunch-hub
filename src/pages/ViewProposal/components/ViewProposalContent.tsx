
import React from "react";
import { ProposalSkeleton } from "@/components/proposals/loading/ProposalSkeleton";
import { ProposalError } from "@/components/proposals/view/ProposalError";
import { ProposalContent } from "@/components/proposals/view/ProposalContent";
import { ClientAuthWrapper } from "@/components/proposals/view/ClientAuthWrapper";
import { ProposalData } from "@/types/proposals";

interface ViewProposalContentProps {
  // Data props
  proposal: ProposalData | null;
  loading: boolean;
  error: string | null;
  clientEmail: string | null;
  token: string | null;
  user: any;
  
  // Auth props
  showAuthForm: boolean;
  handleAuthComplete: () => void;
  showSignInPrompt: boolean;
  
  // Action props
  canDelete: boolean;
  isReviewLater: boolean;
  canTakeAction: boolean;
  isClient: boolean;
  handleApprove: () => Promise<void>;
  handleReject: () => Promise<void>;
  handleDelete: () => Promise<void>;
  handleReviewLater: () => Promise<void>;
  handleSignInClick: () => void;
  deleteDialogOpen: boolean;
  setDeleteDialogOpen: (open: boolean) => void;
  
  // Utility props
  handleRetry: () => void;
}

export function ViewProposalContent({
  proposal,
  loading,
  error,
  clientEmail,
  token,
  user,
  showAuthForm,
  handleAuthComplete,
  showSignInPrompt,
  canDelete,
  isReviewLater,
  canTakeAction,
  isClient,
  handleApprove,
  handleReject,
  handleDelete,
  handleReviewLater,
  handleSignInClick,
  deleteDialogOpen,
  setDeleteDialogOpen,
  handleRetry
}: ViewProposalContentProps) {
  
  if (loading) {
    console.log("=== Showing Loading State ===");
    return (
      <div className="container max-w-5xl mx-auto px-4 py-12">
        <ProposalSkeleton />
      </div>
    );
  }
  
  if (error) {
    console.log("=== Showing Error State ===", error);
    return <ProposalError errorMessage={error} onRetry={handleRetry} />;
  }
  
  // If we need to show the auth form
  if (showAuthForm && clientEmail && proposal) {
    return (
      <div className="container max-w-5xl mx-auto px-4 py-12">
        <h1 className="text-2xl font-bold text-center mb-6">
          Sign in to take action on this proposal
        </h1>
        <p className="text-center mb-8">
          To respond to the proposal "{proposal.title}", 
          please sign in or create an account.
        </p>
        <ClientAuthWrapper
          proposalId={proposal.id} 
          clientEmail={clientEmail} 
          onAuthComplete={handleAuthComplete}
          requireAuth={true}
        />
      </div>
    );
  }
  
  if (!proposal) {
    console.log("=== No Proposal Found ===");
    return (
      <div className="container max-w-5xl mx-auto px-4 py-12">
        <div className="text-center">
          <p className="text-carbon-gray-500">Proposal not found</p>
        </div>
      </div>
    );
  }
  
  console.log("=== Showing Proposal Content ===", { id: proposal.id, title: proposal.title });
  
  // Action wrapper functions that handle authentication state
  const handleApproveWrapper = async () => {
    if (!user) {
      handleSignInClick();
      return;
    }
    await handleApprove();
  };
  
  const handleRejectWrapper = async () => {
    if (!user) {
      handleSignInClick();
      return;
    }
    await handleReject();
  };
  
  const handleDeleteWrapper = async () => {
    if (!user) {
      handleSignInClick();
      return;
    }
    await handleDelete();
  };
  
  return (
    <ProposalContent
      proposal={proposal}
      token={token}
      clientEmail={clientEmail}
      canDelete={canDelete && !!user}
      isReviewLater={isReviewLater}
      canTakeAction={canTakeAction && !!user}
      isClient={isClient}
      handleApprove={handleApproveWrapper}
      handleReject={handleRejectWrapper}
      handleDelete={handleDeleteWrapper}
      handleReviewLater={handleReviewLater}
      handleSignInClick={handleSignInClick}
      deleteDialogOpen={deleteDialogOpen}
      setDeleteDialogOpen={setDeleteDialogOpen}
      showSignInPrompt={showSignInPrompt}
    />
  );
}
