
import React, { useState, useEffect } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { ProposalSkeleton } from "@/components/proposals/loading/ProposalSkeleton";
import { ProposalError } from "@/components/proposals/view/ProposalError";
import { useViewProposal } from "@/hooks/proposals/view/useViewProposal";
import { useAuth } from "@/contexts/auth";
import { logger } from "@/lib/logger";
import { ProposalContent } from "@/components/proposals/view/ProposalContent";
import { ProposalAuthWrapper } from "@/components/proposals/view/ProposalAuthWrapper";

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
  
  const [showAuthForm, setShowAuthForm] = useState(false);
  const [authRequired, setAuthRequired] = useState(false);
  
  // Determine when to show the auth form
  useEffect(() => {
    if (!loading && proposal && clientEmail && token && !user && showAuthForm) {
      viewLogger.info("Showing authentication form for client", {
        hasClientEmail: !!clientEmail,
        hasToken: !!token,
        authRequired
      });
    }
  }, [loading, proposal, token, clientEmail, user, authRequired, showAuthForm, viewLogger]);
  
  // Handler for when auth is complete
  const handleAuthComplete = () => {
    viewLogger.info("Authentication completed, refreshing view", { action: 'authComplete' });
    setShowAuthForm(false);
  };
  
  // Handler for when user wants to sign in (to take actions)
  const handleSignInClick = () => {
    if (proposal) {
      viewLogger.info("User clicked sign in to take actions", { proposalId: proposal.id });
      setAuthRequired(true);
      setShowAuthForm(true);
    }
  };
  
  // Create wrapper functions that return void instead of boolean
  const handleApproveWrapper = async () => {
    await handleApprove();
  };
  
  const handleRejectWrapper = async () => {
    await handleReject();
  };
  
  const handleArchiveWrapper = async () => {
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
      <ProposalAuthWrapper
        showAuthForm={showAuthForm}
        clientEmail={clientEmail}
        proposal={proposal}
        authRequired={authRequired}
        onAuthComplete={handleAuthComplete}
      />
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
      canArchive={canArchive}
      isReviewLater={isReviewLater}
      canTakeAction={canTakeAction}
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
