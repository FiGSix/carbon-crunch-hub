
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/auth";
import { useProposalData } from "./useProposalData";
import { useProposalActions } from "./useProposalActions";
import { useProposalStatus } from "./useProposalStatus";
import { ProposalData } from "@/types/proposals";
import { logger } from "@/lib/logger";

/**
 * Hook for viewing and interacting with a proposal
 */
export function useViewProposal(id?: string, token?: string | null, onDeleteSuccess?: () => void) {
  const { user } = useAuth();
  const { proposal: initialProposal, loading: initialLoading, error: initialError, clientEmail, fetchProposal } = useProposalData(id, token);
  const [proposal, setProposal] = useState<ProposalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Create a contextualized logger
  const viewProposalLogger = logger.withContext({ 
    component: 'ViewProposal', 
    feature: 'proposals' 
  });
  
  const { 
    handleApprove, 
    handleReject,
    handleDelete,
    handleReviewLater,
    deleteDialogOpen,
    setDeleteDialogOpen,
    deleteLoading
  } = useProposalActions(fetchProposal, onDeleteSuccess);
  
  // Update local state when initial data loads
  useEffect(() => {
    if (!initialLoading) {
      setProposal(initialProposal);
      setLoading(initialLoading);
      setError(initialError);
    }
  }, [initialProposal, initialLoading, initialError]);
  
  // Get proposal status data
  const { canDelete, isReviewLater, isClient, canTakeAction, isAuthenticated } = useProposalStatus(proposal);

  // Create wrapper functions that convert boolean returns to void
  const handleApproveWrapper = async (): Promise<void> => {
    if (proposal?.id) {
      await handleApprove(proposal.id);
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

  const handleReviewLaterWrapper = async (): Promise<void> => {
    if (proposal?.id) {
      await handleReviewLater(proposal.id, !!proposal.review_later_until);
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
    handleReviewLater: handleReviewLaterWrapper,
    deleteDialogOpen,
    setDeleteDialogOpen,
    deleteLoading,
    canDelete,
    isReviewLater,
    canTakeAction,
    isClient,
    isAuthenticated,
    // Expose fetchProposal from useProposalData
    fetchProposal
  };
}
