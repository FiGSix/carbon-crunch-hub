
import React from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { ProposalSkeleton } from "@/components/proposals/loading/ProposalSkeleton";
import { ProposalHeader } from "@/components/proposals/view/ProposalHeader";
import { ProposalError } from "@/components/proposals/view/ProposalError";
import { ProposalDetails } from "@/components/proposals/view/ProposalDetails";
import { useViewProposal } from "@/hooks/useViewProposal";
import { ProposalArchiveDialog } from "@/components/proposals/view/ProposalArchiveDialog";
import { useAuth } from "@/contexts/AuthContext";

const ViewProposal = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const { user, userRole } = useAuth();
  
  const {
    proposal,
    loading,
    error,
    handleApprove,
    handleReject,
    handleArchive,
    handleReviewLater,
    archiveDialogOpen,
    setArchiveDialogOpen,
    canArchive,
    isReviewLater
  } = useViewProposal(id, token);
  
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
  
  // Modified logic: Client can take action if they're authenticated and proposal is pending (regardless of token)
  const canTakeAction = isClient && proposal.status === 'pending' && !proposal.archived_at && !isReviewLater;
  
  console.log("Showing proposal action buttons:", {
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
