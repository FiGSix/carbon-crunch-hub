
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useProposalData } from "./proposal/useProposalData";
import { useProposalOperations } from "./proposal/useProposalOperations";
import { ProposalData } from "@/components/proposals/view/types";

export function useViewProposal(id?: string, token?: string | null) {
  const { user } = useAuth();
  const { proposal, loading, error } = useProposalData(id, token);
  const { loading: operationLoading, approveProposal, rejectProposal, archiveProposal, toggleReviewLater } = useProposalOperations();
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  
  // Handle operations on the proposal
  const handleApprove = async () => {
    if (!proposal?.id) return;
    
    const result = await approveProposal(proposal.id);
    if (result.success) {
      // Update local state
      setLocalProposal(prev => prev ? {
        ...prev, 
        status: 'approved', 
        signed_at: new Date().toISOString(),
        review_later_until: null
      } : null);
    }
  };
  
  const handleReject = async () => {
    if (!proposal?.id) return;
    
    const result = await rejectProposal(proposal.id);
    if (result.success) {
      // Update local state
      setLocalProposal(prev => prev ? {
        ...prev, 
        status: 'rejected',
        review_later_until: null
      } : null);
    }
  };

  const handleArchive = async () => {
    if (!proposal?.id || !user?.id) return;
    
    const result = await archiveProposal(proposal.id, user.id);
    if (result.success) {
      // Update local state
      setLocalProposal(prev => prev ? {
        ...prev, 
        archived_at: new Date().toISOString(),
        archived_by: user.id,
        review_later_until: null
      } : null);
      
      setArchiveDialogOpen(false);
    }
  };

  const handleReviewLater = async () => {
    if (!proposal?.id) return;
    
    // Toggle review later status
    const isCurrentlyMarkedForReviewLater = !!proposal.review_later_until;
    const result = await toggleReviewLater(proposal.id, isCurrentlyMarkedForReviewLater);
    
    if (result.success) {
      // Update local state with the new review_later_until value
      setLocalProposal(prev => prev ? {
        ...prev, 
        review_later_until: result.reviewLaterUntil || null
      } : null);
    }
  };

  // Helper function to update local proposal state
  const setLocalProposal = (updater: React.SetStateAction<ProposalData | null>) => {
    if (typeof updater === 'function') {
      const result = updater(proposal);
      if (result) {
        window.dispatchEvent(new CustomEvent('proposal-updated', { detail: result }));
      }
    } else if (updater) {
      window.dispatchEvent(new CustomEvent('proposal-updated', { detail: updater }));
    }
  };

  // Check if the current user can archive this proposal
  const canArchive = !!user && !!proposal && !proposal.archived_at && 
    (user.id === proposal.client_id || user.id === proposal.agent_id);
  
  // Check if the proposal is marked for review later
  const isReviewLater = !!proposal?.review_later_until;
  
  return {
    proposal,
    loading,
    error,
    handleApprove,
    handleReject,
    handleArchive,
    handleReviewLater,
    archiveDialogOpen,
    setArchiveDialogOpen,
    archiveLoading: operationLoading.archive,
    canArchive,
    isReviewLater
  };
}
