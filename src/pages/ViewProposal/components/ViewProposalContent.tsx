
import { useEffect } from 'react';
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
  canTakeAction: boolean;
  isClient: boolean;
  handleApprove: (typedName: string) => Promise<void>;
  handleReject: () => Promise<void>;
  handleDelete: () => Promise<void>;
  handleSignInClick: () => void;
  deleteDialogOpen: boolean;
  setDeleteDialogOpen: (open: boolean) => void;
  
  // Utility props
  handleRetry: () => void;
  onProposalUpdate?: () => void;
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
  canTakeAction,
  isClient,
  handleApprove,
  handleReject,
  handleDelete,
  handleSignInClick,
  deleteDialogOpen,
  setDeleteDialogOpen,
  handleRetry,
  onProposalUpdate
}: ViewProposalContentProps) {
  
  // Phase 4: Add effect to detect when user becomes authenticated
  useEffect(() => {
    if (user && !showAuthForm && proposal) {
      // User just became authenticated, ensure we're showing the proposal
      console.log("=== User Authenticated Post-Registration ===", {
        userId: user.id,
        proposalId: proposal?.id
      });
      
      // Trigger a proposal refresh if we have the handler
      if (onProposalUpdate) {
        onProposalUpdate();
      }
    }
  }, [user, showAuthForm, proposal?.id, onProposalUpdate]);
  
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
        <h1 className="text-2xl font-bold text-center mb-4">
          Almost there! Complete your account to respond
        </h1>
        <p className="text-center text-muted-foreground mb-8">
          To approve or reject "{proposal.title}", create your account or sign in below.
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
  const handleApproveWrapper = async (typedName: string) => {
    if (!user) {
      handleSignInClick();
      return;
    }
    await handleApprove(typedName);
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
      canTakeAction={canTakeAction && !!user}
      isClient={isClient}
      handleApprove={handleApproveWrapper}
      handleReject={handleRejectWrapper}
      handleDelete={handleDeleteWrapper}
      handleSignInClick={handleSignInClick}
      deleteDialogOpen={deleteDialogOpen}
      setDeleteDialogOpen={setDeleteDialogOpen}
      showSignInPrompt={showSignInPrompt}
      onProposalUpdate={onProposalUpdate}
    />
  );
}
