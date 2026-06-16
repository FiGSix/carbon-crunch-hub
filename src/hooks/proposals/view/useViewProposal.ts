
import { useAuth } from "@/contexts/auth";
import { useProposalData } from "./useProposalData";
import { useProposalActions } from "./useProposalActions";
import { useProposalStatus } from "./useProposalStatus";
import { useProposalClientCompanyId } from "./useProposalClientCompanyId";
import { logger } from "@/lib/logger";

/**
 * Hook for viewing and interacting with a proposal
 */
export function useViewProposal(id?: string, token?: string | null, onDeleteSuccess?: () => void) {
  const { user } = useAuth();
  const { proposal, loading, error, clientEmail, fetchProposal } = useProposalData(id, token);
  
  // Fetch client company ID for team member permission check
  const { clientCompanyId } = useProposalClientCompanyId(proposal);
  
  // Create a contextualized logger
  const viewProposalLogger = logger.withContext({ 
    component: 'ViewProposal', 
    feature: 'proposals' 
  });
  
  const { 
    handleApprove, 
    handleReject,
    handleDelete,
    deleteDialogOpen,
    setDeleteDialogOpen,
    deleteLoading
  } = useProposalActions(fetchProposal, onDeleteSuccess);
  
  // Get proposal status data - now includes team member check via clientCompanyId
  const { isClient, canTakeAction, isAuthenticated } = useProposalStatus(
    proposal, 
    token,
    { proposalClientCompanyId: clientCompanyId }
  );

  // Create wrapper functions that convert boolean returns to void and pass typed name
  const handleApproveWrapper = async (typedName: string): Promise<void> => {
    if (proposal?.id) {
      await handleApprove(proposal.id, typedName);
    }
  };

  const handleRejectWrapper = async (): Promise<void> => {
    if (proposal?.id) {
      await handleReject(proposal.id);
    }
  };

  const handleDeleteWrapper = async (): Promise<void> => {
    if (proposal?.id && user?.id) {
      await handleDelete(proposal.id, user.id);
    }
  };

  return {
    proposal,
    loading,
    error,
    clientEmail,
    handleApprove: handleApproveWrapper,
    handleReject: handleRejectWrapper,
    handleDelete: handleDeleteWrapper,
    deleteDialogOpen,
    setDeleteDialogOpen,
    deleteLoading,
    canTakeAction,
    isClient,
    isAuthenticated,
    // Expose fetchProposal from useProposalData
    fetchProposal
  };
}
