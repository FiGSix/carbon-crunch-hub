
import React from "react";
import { useViewProposalLogic } from "./hooks/useViewProposalLogic";
import { useViewProposalAuth } from "./hooks/useViewProposalAuth";
import { ViewProposalContent } from "./components/ViewProposalContent";

const ViewProposalPage = () => {
  const viewProposalLogic = useViewProposalLogic();
  const viewProposalAuth = useViewProposalAuth(
    viewProposalLogic.proposal, 
    viewProposalLogic.clientEmail, 
    viewProposalLogic.token
  );
  
  return (
    <ViewProposalContent
      // Data props
      proposal={viewProposalLogic.proposal}
      loading={viewProposalLogic.loading}
      error={viewProposalLogic.error}
      clientEmail={viewProposalLogic.clientEmail}
      token={viewProposalLogic.token}
      user={viewProposalAuth.user}
      
      // Auth props
      showAuthForm={viewProposalAuth.showAuthForm}
      handleAuthComplete={viewProposalAuth.handleAuthComplete}
      showSignInPrompt={viewProposalAuth.showSignInPrompt}
      
      // Action props
      canDelete={viewProposalLogic.canDelete}
      isReviewLater={viewProposalLogic.isReviewLater}
      canTakeAction={viewProposalLogic.canTakeAction}
      isClient={viewProposalLogic.isClient}
      handleApprove={viewProposalLogic.handleApprove}
      handleReject={viewProposalLogic.handleReject}
      handleDelete={viewProposalLogic.handleDelete}
      handleReviewLater={viewProposalLogic.handleReviewLater}
      handleSignInClick={viewProposalAuth.handleSignInClick}
      deleteDialogOpen={viewProposalLogic.deleteDialogOpen}
      setDeleteDialogOpen={viewProposalLogic.setDeleteDialogOpen}
      
      // Utility props
      handleRetry={viewProposalLogic.handleRetry}
    />
  );
};

export default ViewProposalPage;
