
import React, { useState, useEffect } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { ProposalSkeleton } from "@/components/proposals/loading/ProposalSkeleton";
import { ProposalError } from "@/components/proposals/view/ProposalError";
import { useViewProposal } from "@/hooks/proposals/view/useViewProposal";
import { useAuth } from "@/contexts/auth";
import { logger } from "@/lib/logger";
import { ProposalContent } from "@/components/proposals/view/ProposalContent";
import { ClientAuthWrapper } from "@/components/proposals/view/ClientAuthWrapper";

const ViewProposal = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const { user } = useAuth();
  
  // Create a contextualized logger
  const viewLogger = logger.withContext({ 
    component: 'ViewProposalPage', 
    feature: 'proposals' 
  });
  
  const {
    proposal,
    loading,
    error,
    clientEmail,
    handleApprove,
    handleReject,
    handleArchive,
    handleReviewLater,
    archiveDialogOpen,
    setArchiveDialogOpen,
    canArchive,
    isReviewLater,
    canTakeAction,
    isClient,
    isAuthenticated
  } = useViewProposal(id, token);
  
  // Only show authentication when an action is attempted
  const [showAuthForm, setShowAuthForm] = useState(false);
  
  // Handler for when auth is complete
  const handleAuthComplete = () => {
    viewLogger.info("Authentication completed, refreshing view", { action: 'authComplete' });
    setShowAuthForm(false);
  };
  
  // Handler for when user wants to sign in (to take actions)
  const handleSignInClick = () => {
    if (proposal) {
      viewLogger.info("User clicked sign in to take actions", { proposalId: proposal.id });
      setShowAuthForm(true);
    }
  };
  
  // Create wrapper functions that return void instead of boolean
  const handleApproveWrapper = async () => {
    // If not authenticated, show auth form
    if (!user) {
      handleSignInClick();
      return;
    }
    await handleApprove();
  };
  
  const handleRejectWrapper = async () => {
    // If not authenticated, show auth form
    if (!user) {
      handleSignInClick();
      return;
    }
    await handleReject();
  };
  
  const handleArchiveWrapper = async () => {
    // If not authenticated, show auth form
    if (!user) {
      handleSignInClick();
      return;
    }
    await handleArchive();
  };
  
  // Log details for debugging purposes
  useEffect(() => {
    if (proposal) {
      viewLogger.info("ViewProposal - Current proposal state", { 
        id: proposal.id,
        status: proposal.status,
        isClient,
        canTakeAction,
        hasClientId: !!proposal.client_id,
        hasClientContactId: !!proposal.client_contact_id,
        userLoggedIn: !!user
      });
    }
  }, [proposal, isClient, canTakeAction, viewLogger, user]);
  
  if (loading) {
    return (
      <div className="container max-w-5xl mx-auto px-4 py-12">
        <ProposalSkeleton />
      </div>
    );
  }
  
  if (error) {
    viewLogger.error("Error loading proposal", { error });
    return <ProposalError errorMessage={error} />;
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
    viewLogger.warn("No proposal found", { path: window.location.pathname });
    return (
      <div className="container max-w-5xl mx-auto px-4 py-12">
        <div className="text-center">
          <p className="text-carbon-gray-500">Proposal not found</p>
        </div>
      </div>
    );
  }
  
  // Determine if we should show the sign-in prompt - token access but not logged in
  const showSignInPrompt = !user && token && clientEmail && 
    proposal.status === 'pending' && !proposal.archived_at && !isReviewLater;
  
  return (
    <ProposalContent
      proposal={proposal}
      token={token}
      clientEmail={clientEmail}
      canArchive={user && canArchive}
      isReviewLater={isReviewLater}
      canTakeAction={user && canTakeAction}
      isClient={isClient}
      handleApprove={handleApproveWrapper}
      handleReject={handleRejectWrapper}
      handleArchive={handleArchiveWrapper}
      handleReviewLater={handleReviewLater}
      handleSignInClick={handleSignInClick}
      archiveDialogOpen={archiveDialogOpen}
      setArchiveDialogOpen={setArchiveDialogOpen}
      showSignInPrompt={showSignInPrompt}
    />
  );
};

export default ViewProposal;
