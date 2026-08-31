
import { useEffect } from 'react';
import { ProposalSkeleton } from "@/components/proposals/loading/ProposalSkeleton";
import { ProposalError } from "@/components/proposals/view/ProposalError";
import { ProposalContent } from "@/components/proposals/view/ProposalContent";
import { ClientAuthWrapper } from "@/components/proposals/view/ClientAuthWrapper";
import { ProposalAuthRequired } from "@/components/proposals/view/ProposalAuthRequired";
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
  
  // Log when user authenticates (auth listener in useProposalData handles refetch)
  useEffect(() => {
    if (user && !showAuthForm) {
      if (import.meta.env.DEV) {
        console.log("User authenticated, auth listener will handle refetch", {
          userId: user.id
        });
      }
    }
  }, [user?.id, showAuthForm]);
  
  if (loading) {
    return (
      <div className="container max-w-5xl mx-auto px-4 py-12">
        <ProposalSkeleton />
      </div>
    );
  }
  
  if (error === "REQUIRES_AUTH") {
    return <ProposalAuthRequired onRetry={handleRetry} />;
  }
  
  if (error) {
    return <ProposalError errorMessage={error} onRetry={handleRetry} />;
  }
  
  // If we need to show the auth form.
  // Token holders never see this: they sign directly from the emailed link.
  if (showAuthForm && clientEmail && proposal && !token) {
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
    return (
      <div className="container max-w-5xl mx-auto px-4 py-12">
        <div className="text-center">
          <p className="text-muted-foreground">Proposal not found</p>
        </div>
      </div>
    );
  }

  // Token visitors are sent straight to the signing ceremony — no account required.
  const tokenOnly = !user && !!token;
  const goToSigning = () => {
    window.location.href = `/proposals/${proposal.id}/accept?token=${token}`;
  };
  const goToDecline = () => {
    window.location.href = `/proposals/${proposal.id}/decline?token=${token}`;
  };
  
  // Action wrapper functions that handle authentication state
  const handleApproveWrapper = async (typedName: string) => {
    if (tokenOnly) {
      goToSigning();
      return;
    }
    if (!user) {
      handleSignInClick();
      return;
    }
    await handleApprove(typedName);
  };
  
  const handleRejectWrapper = async () => {
    if (tokenOnly) {
      goToDecline();
      return;
    }
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
      canTakeAction={canTakeAction && (!!user || tokenOnly)}
      isClient={isClient}
      handleApprove={handleApproveWrapper}
      handleReject={handleRejectWrapper}
      handleDelete={handleDeleteWrapper}
      handleSignInClick={tokenOnly ? goToSigning : handleSignInClick}
      deleteDialogOpen={deleteDialogOpen}
      setDeleteDialogOpen={setDeleteDialogOpen}
      showSignInPrompt={showSignInPrompt && !tokenOnly}
      onProposalUpdate={onProposalUpdate}
    />
  );
}
