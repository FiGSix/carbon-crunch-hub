

import { ProposalHeader } from './ProposalHeader';
import { ProposalDetails } from './ProposalDetails';
import { ProposalDeleteDialog } from './ProposalDeleteDialog';
import { SignInPrompt } from './SignInPrompt';
import { ProjectInformation, ProposalData } from '@/types/proposals';
import { useAuth } from '@/contexts/auth';

interface ProposalContentProps {
  proposal: ProposalData;
  token: string | null;
  clientEmail: string | null;
  canTakeAction: boolean;
  isClient: boolean;
  handleApprove: (typedName: string) => Promise<void>;
  handleReject: () => Promise<void>;
  handleDelete: () => Promise<void>;
  handleSignInClick: () => void;
  deleteDialogOpen: boolean;
  setDeleteDialogOpen: (open: boolean) => void;
  showSignInPrompt: boolean;
  onProposalUpdate?: () => void;
}

export function ProposalContent({
  proposal,
  token,
  clientEmail,
  canTakeAction,
  isClient,
  handleApprove,
  handleReject,
  handleDelete,
  handleSignInClick,
  deleteDialogOpen,
  setDeleteDialogOpen,
  showSignInPrompt,
  onProposalUpdate
}: ProposalContentProps) {
  const { userRole } = useAuth();
  
  // Extract project info from the proposal content for the header
  const projectInfo = proposal.content?.projectInfo || {} as ProjectInformation;

  return (
    <div className="container max-w-5xl mx-auto px-4 py-12">
      <ProposalHeader
        title={proposal.title}
        showInvitationBadge={!!token}
        projectSize={projectInfo.size}
        projectName={projectInfo.name}
        isDeleted={!!proposal.deleted_at}
        proposalId={proposal.id}
        proposal={proposal as any}
        onProposalUpdate={onProposalUpdate}
      />
      
      <div className="space-y-8">
        <ProposalDetails 
          proposal={proposal}
          token={token}
          onApprove={handleApprove}
          onReject={handleReject}
          showActions={canTakeAction}
          isClient={isClient}
        />
        
        {/* Sign In Prompt - Show when not logged in but token access is valid */}
        {showSignInPrompt && (
          <SignInPrompt onSignInClick={handleSignInClick} />
        )}
      </div>

      {/* Delete Dialog - Only for agents and admins */}
      {!isClient && (userRole === 'agent' || userRole === 'admin') && (
        <ProposalDeleteDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          onDelete={handleDelete}
          isClient={isClient}
        />
      )}
    </div>
  );
}
