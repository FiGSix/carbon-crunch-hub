
import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { ProposalSkeleton } from "@/components/proposals/loading/ProposalSkeleton";
import { ProposalHeader } from "@/components/proposals/view/ProposalHeader";
import { ProposalError } from "@/components/proposals/view/ProposalError";
import { ProposalDetails } from "@/components/proposals/view/ProposalDetails";
import { useViewProposal } from "@/hooks/proposals/view/useViewProposal";
import { ProposalArchiveDialog } from "@/components/proposals/view/ProposalArchiveDialog";
import { useAuth } from "@/contexts/auth";
import { ClientAuthWrapper } from "@/components/proposals/view/ClientAuthWrapper";
import { logger } from "@/lib/logger";
import { ProjectInformation } from "@/types/proposals";
import { Button } from "@/components/ui/button";
import { LogIn } from "lucide-react";

const ViewProposal = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const { user } = useAuth();
  const navigate = useNavigate();
  
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
    // No need to force reload anymore, just update the state
  };
  
  // Handler for when user wants to sign in (to take actions)
  const handleSignInClick = () => {
    viewLogger.info("User clicked sign in to take actions", { proposalId: proposal?.id });
    setAuthRequired(true);
    setShowAuthForm(true);
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
        <h1 className="text-2xl font-bold text-center mb-6">Authenticate to {authRequired ? 'Take Action on' : 'View'} Proposal</h1>
        <p className="text-center mb-8">
          To {authRequired ? 'take action on' : 'view'} the proposal "{proposal.title}", please sign in or create an account.
        </p>
        <ClientAuthWrapper 
          proposalId={proposal.id} 
          clientEmail={clientEmail} 
          onAuthComplete={handleAuthComplete}
          requireAuth={authRequired}
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
  
  // Extract project info from the proposal content for the header and cast to the correct type
  const projectInfo = proposal.content?.projectInfo || {} as ProjectInformation;
  
  viewLogger.debug("ViewProposal - Show action buttons", { 
    isClient,
    status: proposal.status,
    isArchived: !!proposal.archived_at,
    isReviewLater,
    canTakeAction,
    userLoggedIn: !!user
  });
  
  // Determine if we should show the sign-in prompt - token access but not logged in
  const showSignInPrompt = !user && token && clientEmail && proposal.status === 'pending' && !proposal.archived_at && !isReviewLater;
  
  return (
    <div className="container max-w-5xl mx-auto px-4 py-12">
      <ProposalHeader
        title={proposal.title}
        showInvitationBadge={!!token}
        projectSize={projectInfo.size}
        projectName={projectInfo.name}
        canArchive={canArchive}
        isArchived={!!proposal.archived_at}
        isReviewLater={isReviewLater}
        onArchiveClick={() => setArchiveDialogOpen(true)}
        onReviewLaterClick={handleReviewLater}
      />
      
      <div className="space-y-8">
        <ProposalDetails 
          proposal={proposal}
          token={token}
          onApprove={handleApproveWrapper}
          onReject={handleRejectWrapper}
          isReviewLater={isReviewLater}
          showActions={canTakeAction}
        />
        
        {/* Sign In Prompt - Show when not logged in but token access is valid */}
        {showSignInPrompt && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mt-4">
            <h3 className="text-lg font-medium text-blue-800">Want to respond to this proposal?</h3>
            <p className="text-blue-600 mt-2">
              Sign in or create an account to approve, reject, or save this proposal for later.
            </p>
            <Button 
              onClick={handleSignInClick}
              className="mt-4"
              variant="outline"
            >
              <LogIn className="mr-2 h-4 w-4" />
              Sign in or Register
            </Button>
          </div>
        )}
      </div>

      {/* Archive Dialog */}
      <ProposalArchiveDialog
        open={archiveDialogOpen}
        onOpenChange={setArchiveDialogOpen}
        onArchive={handleArchiveWrapper}
        isClient={isClient}
      />
    </div>
  );
};

export default ViewProposal;
