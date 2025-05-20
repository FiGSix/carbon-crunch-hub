
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
  
  // Mark invitation as viewed when opening with token
  // Now we mark it as viewed regardless of authentication status
  useEffect(() => {
    if (!loading && proposal && token) {
      viewProposalLogger.info("Marking invitation as viewed", { proposalId: proposal.id });
      markInvitationViewed(token, proposal);
    }
  }, [token, proposal, loading, markInvitationViewed, viewProposalLogger]);
  
  // Get proposal status data
  const { canArchive, isReviewLater, isClient, canTakeAction, isAuthenticated } = useProposalStatus(proposal);

  return {
    proposal,
    loading,
    error,
    clientEmail,
    handleApprove: proposal?.id ? () => handleApprove(proposal.id) : () => Promise.resolve(false),
    handleReject: proposal?.id ? () => handleReject(proposal.id) : () => Promise.resolve(false),
    handleArchive: proposal?.id && user?.id ? () => handleArchive(proposal.id, user.id) : () => Promise.resolve(false),
    handleReviewLater: proposal?.id ? () => handleReviewLater(proposal.id, !!proposal.review_later_until) : () => Promise.resolve(false),
    archiveDialogOpen,
    setArchiveDialogOpen,
    archiveLoading,
    canArchive,
    isReviewLater,
    canTakeAction,
    isClient,
    isAuthenticated
  };
}
