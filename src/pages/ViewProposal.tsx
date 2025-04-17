
import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { ProposalSkeleton } from "@/components/proposals/loading/ProposalSkeleton";
import { ProposalHeader } from "@/components/proposals/view/ProposalHeader";
import { ProposalError } from "@/components/proposals/view/ProposalError";
import { ProposalDetails } from "@/components/proposals/view/ProposalDetails";
import { useViewProposal } from "@/hooks/useViewProposal";
import { ProposalArchiveDialog } from "@/components/proposals/view/ProposalArchiveDialog";
import { useAuth } from "@/contexts/auth";
import { ClientAuthWrapper } from "@/components/proposals/view/ClientAuthWrapper";

const ViewProposal = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const { user, userRole } = useAuth();
  const navigate = useNavigate();
  
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
    isReviewLater
  } = useViewProposal(id, token);
  
  const [showAuthForm, setShowAuthForm] = useState(false);
  
  // Determine if we need to show auth form based on token and user state
  useEffect(() => {
    if (!loading && token && clientEmail && !user) {
      setShowAuthForm(true);
    } else {
      setShowAuthForm(false);
    }
  }, [loading, token, clientEmail, user]);
  
  // Handler for when auth is complete
  const handleAuthComplete = () => {
    setShowAuthForm(false);
    // Force refresh the component to get latest auth state
    window.location.reload();
  };
  
  // Log details for debugging purposes
  useEffect(() => {
    if (proposal) {
      console.log("ViewProposal - Current proposal state:", {
        id: proposal.id,
        status: proposal.status,
        isClient: user?.id === proposal.client_id,
        canTakeAction: user?.id === proposal.client_id && proposal.status === 'pending'
      });
    }
  }, [proposal, user]);
  
  if (loading) {
    return (
      <div className="container max-w-5xl mx-auto px-4 py-12">
        <ProposalSkeleton />
      </div>
    );
  }
  
  if (error) {
    return <ProposalError errorMessage={error} />;
  }
  
  // If we need to show the auth form
  if (showAuthForm && clientEmail && proposal) {
    return (
      <div className="container max-w-5xl mx-auto px-4 py-12">
        <h1 className="text-2xl font-bold text-center mb-6">Authenticate to View Proposal</h1>
        <p className="text-center mb-8">
          To view the proposal "{proposal.title}", please sign in or create an account.
        </p>
        <ClientAuthWrapper 
          proposalId={proposal.id} 
          clientEmail={clientEmail} 
          onAuthComplete={handleAuthComplete}
        />
      </div>
    );
  }
  
  if (!proposal) {
    return (
      <div className="container max-w-5xl mx-auto px-4 py-12">
        <div className="text-center">
          <p className="text-carbon-gray-500">Proposal not found</p>
        </div>
      </div>
    );
  }
  
  // Extract project info from the proposal content for the header
  const projectInfo = proposal.content?.projectInfo || {};
  const isClient = user?.id === proposal.client_id;
  
  // Client can take action if they're authenticated and proposal is pending (regardless of token)
  const canTakeAction = isClient && proposal.status === 'pending' && !proposal.archived_at && !isReviewLater;
  
  console.log("ViewProposal - Show action buttons:", {
    isClient,
    status: proposal.status,
    isArchived: !!proposal.archived_at,
    isReviewLater,
    canTakeAction
  });
  
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
          onApprove={handleApprove}
          onReject={handleReject}
          isReviewLater={isReviewLater}
          showActions={canTakeAction}
        />
      </div>

      {/* Archive Dialog */}
      <ProposalArchiveDialog
        open={archiveDialogOpen}
        onOpenChange={setArchiveDialogOpen}
        onArchive={handleArchive}
        isClient={isClient}
      />
    </div>
  );
}

export default ViewProposal;
