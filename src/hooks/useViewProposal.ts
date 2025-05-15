
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/auth";
import { useProposalData } from "./proposal/useProposalData";
import { useProposalActions } from "./proposal/useProposalActions";
import { useProposalStatus } from "./proposal/useProposalStatus";
import { useMarkInvitationViewed } from "./proposal/useMarkInvitationViewed";
import { ProposalData } from "@/types/proposals";

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
  
  const { 
    handleApprove: actionApprove, 
    handleReject: actionReject,
    handleArchive: actionArchive,
    handleReviewLater: actionReviewLater,
    archiveDialogOpen,
    setArchiveDialogOpen,
    archiveLoading
  } = useProposalActions();
  
  // Update local state when initial data loads
  useEffect(() => {
    if (!initialLoading) {
      setProposal(initialProposal);
      setLoading(initialLoading);
      setError(initialError);
    }
  }, [initialProposal, initialLoading, initialError]);
  
  // Mark invitation as viewed when opening with token
  useEffect(() => {
    if (!loading && proposal && token) {
      markInvitationViewed(token, proposal);
    }
  }, [token, proposal, loading, markInvitationViewed]);
  
  // Get proposal status data
  const { canArchive, isReviewLater, isClient, canTakeAction } = useProposalStatus(proposal);

  // Refresh data helper
  const refreshData = async () => {
    if (id) {
      await fetchProposal(id, token);
    }
  };
  
  // Proposal action handlers with proper updates to local state
  const handleApprove = async () => {
    if (!proposal?.id) return;
    
    await actionApprove(proposal.id, refreshData);
    
    // Also update local state immediately for better UX
    setProposal(prev => prev ? {
      ...prev, 
      status: 'approved', 
      signed_at: new Date().toISOString(),
      review_later_until: null
    } : null);
  };
  
  const handleReject = async () => {
    if (!proposal?.id) return;
    
    await actionReject(proposal.id, refreshData);
    
    // Also update local state immediately for better UX
    setProposal(prev => prev ? {
      ...prev, 
      status: 'rejected',
      review_later_until: null
    } : null);
  };

  const handleArchive = async () => {
    if (!proposal?.id || !user?.id) return;
    
    await actionArchive(proposal.id, user.id, refreshData);
    
    // Also update local state immediately for better UX
    setProposal(prev => prev ? {
      ...prev, 
      archived_at: new Date().toISOString(),
      archived_by: user.id,
      review_later_until: null
    } : null);
  };

  const handleReviewLater = async () => {
    if (!proposal?.id) return;
    
    // Toggle review later status
    const isCurrentlyMarkedForReviewLater = !!proposal.review_later_until;
    
    const result = await actionReviewLater(proposal.id, isCurrentlyMarkedForReviewLater, refreshData);
    
    if (result) {
      // Updated in refreshData, but also update local state for better UX
      setProposal(prev => prev ? {
        ...prev, 
        review_later_until: isCurrentlyMarkedForReviewLater ? null : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      } : null);
    }
  };

  return {
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
    archiveLoading,
    canArchive,
    isReviewLater,
    canTakeAction,
    isClient
  };
}
