
import React from 'react';
import { ProposalHeader } from './ProposalHeader';
import { ProposalDetails } from './ProposalDetails';
import { ProposalDeleteDialog } from './ProposalDeleteDialog';
import { SignInPrompt } from './SignInPrompt';
import { ProjectInformation, ProposalData } from '@/types/proposals';

interface ProposalContentProps {
  proposal: ProposalData;
  token: string | null;
  clientEmail: string | null;
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
  showSignInPrompt: boolean;
}

export function ProposalContent({
  proposal,
  token,
  clientEmail,
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
  showSignInPrompt
}: ProposalContentProps) {
  // Extract project info from the proposal content for the header
  const projectInfo = proposal.content?.projectInfo || {} as ProjectInformation;

  return (
    <div className="container max-w-5xl mx-auto px-4 py-12">
      <ProposalHeader
        title={proposal.title}
        showInvitationBadge={!!token}
        projectSize={projectInfo.size}
        projectName={projectInfo.name}
        canDelete={canDelete}
        isDeleted={!!proposal.deleted_at}
        isReviewLater={isReviewLater}
        onDeleteClick={() => setDeleteDialogOpen(true)}
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
        
        {/* Sign In Prompt - Show when not logged in but token access is valid */}
        {showSignInPrompt && (
          <SignInPrompt onSignInClick={handleSignInClick} />
        )}
      </div>

      {/* Delete Dialog */}
      <ProposalDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onDelete={handleDelete}
        isClient={isClient}
      />
    </div>
  );
}
