
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/auth";
import { useProposalData } from "./useProposalData";
import { useProposalActions } from "./useProposalActions";
import { useProposalStatus } from "./useProposalStatus";
import { useMarkInvitationViewed } from "./useMarkInvitationViewed";
import { ProposalData } from "@/types/proposals";
import { logger } from "@/lib/logger";

/**
 * Hook for viewing and interacting with a proposal
 */
export function useViewProposal(id?: string, token?: string | null) {
  const { user } = useAuth();
  const { proposal: initialProposal, loading: initialLoading, error: initialError, clientEmail, fetchProposal } = useProposalData(id, token);
  const [proposal, setProposal] = useState<ProposalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { markInvitationViewed } = useMarkInvitationViewed();
  
  // Create a contextualized logger
  const viewProposalLogger = logger.withContext({ 
    component: 'ViewProposal', 
    feature: 'proposals' 
  });
  
  const { 
    handleApprove, 
    handleReject,
    handleArchive,
    handleReviewLater,
    archiveDialogOpen,
    setArchiveDialogOpen,
    archiveLoading
  } = useProposalActions(fetchProposal);
  
  // Update local state when initial data loads
  useEffect(() => {
    if (!initialLoading) {
      setProposal(initialProposal);
      setLoading(initialLoading);
      setError(initialError);
    }
  }, [initialProposal, initialLoading, initialError]);
  
  // Mark invitation as viewed when opening with token as a backup
  // This is redundant with our new approach but kept for reliability
  useEffect(() => {
    if (!loading && proposal && token) {
      viewProposalLogger.info("Backup: Marking invitation as viewed", { proposalId: proposal.id });
      markInvitationViewed(token, proposal);
    }
  }, [token, proposal, loading, markInvitationViewed, viewProposalLogger]);
  
  // Get proposal status data
  const { canArchive, isReviewLater, isClient, canTakeAction, isAuthenticated } = useProposalStatus(proposal);

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

  const handleArchiveWrapper = async (): Promise<void> => {
    if (proposal?.id && user?.id) {
      await handleArchive(proposal.id, user.id);
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
    handleArchive: handleArchiveWrapper,
    handleReviewLater: handleReviewLaterWrapper,
    archiveDialogOpen,
    setArchiveDialogOpen,
    archiveLoading,
    canArchive,
    isReviewLater,
    canTakeAction,
    isClient,
    isAuthenticated,
    // Expose fetchProposal from useProposalData
    fetchProposal
  };
}
