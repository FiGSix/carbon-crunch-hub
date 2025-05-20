
import React from 'react';
import { ProposalHeader } from './ProposalHeader';
import { ProposalDetails } from './ProposalDetails';
import { ProposalArchiveDialog } from './ProposalArchiveDialog';
import { SignInPrompt } from './SignInPrompt';
import { ProjectInformation, ProposalData } from '@/types/proposals';

interface ProposalContentProps {
  proposal: ProposalData;
  token: string | null;
  clientEmail: string | null;
  canArchive: boolean;
  isReviewLater: boolean;
  canTakeAction: boolean;
  isClient: boolean;
  handleApprove: () => Promise<void>;
  handleReject: () => Promise<void>;
  handleArchive: () => Promise<void>;
  handleReviewLater: () => Promise<void>;
  handleSignInClick: () => void;
  archiveDialogOpen: boolean;
  setArchiveDialogOpen: (open: boolean) => void;
  showSignInPrompt: boolean;
}

export function ProposalContent({
  proposal,
  token,
  clientEmail,
  canArchive,
  isReviewLater,
  canTakeAction,
  isClient,
  handleApprove,
  handleReject,
  handleArchive,
  handleReviewLater,
  handleSignInClick,
  archiveDialogOpen,
  setArchiveDialogOpen,
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
        
        {/* Sign In Prompt - Show when not logged in but token access is valid */}
        {showSignInPrompt && (
          <SignInPrompt onSignInClick={handleSignInClick} />
        )}
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
