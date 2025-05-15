
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/auth";
import { useProposalData } from "./proposal/useProposalData";
import { useProposalOperations } from "./proposal/useProposalOperations";
import { ProposalData } from "@/components/proposals/view/types";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";

export function useViewProposal(id?: string, token?: string | null) {
  const { user } = useAuth();
  const { proposal: initialProposal, loading: initialLoading, error: initialError, clientEmail, fetchProposal } = useProposalData(id, token);
  const [proposal, setProposal] = useState<ProposalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { loading: operationLoading, approveProposal, rejectProposal, archiveProposal, toggleReviewLater } = useProposalOperations();
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  
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
    const markInvitationViewed = async () => {
      if (token && proposal?.id && !proposal.invitation_viewed_at) {
        logger.info(`Marking invitation as viewed for proposal: ${proposal.id}`, { proposalId: proposal.id });
        
        try {
          // Update the invitation_viewed_at timestamp
          const { error } = await supabase
            .from('proposals')
            .update({ invitation_viewed_at: new Date().toISOString() })
            .eq('id', proposal.id)
            .eq('invitation_token', token);
            
          if (error) {
            logger.error("Error marking invitation as viewed:", error);
            return;
          }
            
          // Create notification for the agent that client viewed the proposal
          if (proposal.agent_id) {
            await supabase.functions.invoke('create-notification', {
              body: {
                userId: proposal.agent_id,
                title: "Proposal Viewed",
                message: `The client has viewed your proposal: ${proposal.title}`,
                type: "info",
                relatedId: proposal.id,
                relatedType: "proposal"
              }
            });
            logger.info("Agent notification sent for proposal view", { proposalId: proposal.id });
          }
        } catch (error) {
          logger.error("Error in markInvitationViewed:", error);
        }
      }
    };
    
    if (!loading && proposal) {
      markInvitationViewed();
    }
  }, [token, proposal, loading]);
  
  // Handle operations on the proposal
  const handleApprove = async () => {
    if (!proposal?.id) {
      logger.error("Cannot approve proposal: proposal ID is missing", { action: 'approve' });
      return;
    }
    
    logger.info("Approving proposal:", { proposalId: proposal.id });
    
    try {
      const result = await approveProposal(proposal.id);
      if (result.success) {
        logger.info("Proposal approved successfully, refreshing data", { proposalId: proposal.id });
        // Refresh data from the server
        if (id) {
          await fetchProposal(id, token);
        }
        
        // Also update local state immediately for better UX
        setProposal(prev => prev ? {
          ...prev, 
          status: 'approved', 
          signed_at: new Date().toISOString(),
          review_later_until: null
        } : null);
        
        // Force trigger a global event to notify other components
        window.dispatchEvent(new CustomEvent('proposal-status-changed', { 
          detail: { id: proposal.id, status: 'approved' }
        }));
      } else {
        logger.error("Approval failed:", { error: result.error });
        throw new Error(result.error);
      }
    } catch (error) {
      logger.error("Error in handleApprove:", error);
      throw error;
    }
  };
  
  const handleReject = async () => {
    if (!proposal?.id) {
      logger.error("Cannot reject proposal: proposal ID is missing", { action: 'reject' });
      return;
    }
    
    logger.info("Rejecting proposal:", { proposalId: proposal.id });
    
    try {
      const result = await rejectProposal(proposal.id);
      if (result.success) {
        logger.info("Proposal rejected successfully, refreshing data", { proposalId: proposal.id });
        // Refresh data from the server
        if (id) {
          await fetchProposal(id, token);
        }
        
        // Also update local state immediately for better UX
        setProposal(prev => prev ? {
          ...prev, 
          status: 'rejected',
          review_later_until: null
        } : null);
        
        // Force trigger a global event to notify other components
        window.dispatchEvent(new CustomEvent('proposal-status-changed', { 
          detail: { id: proposal.id, status: 'rejected' }
        }));
      } else {
        logger.error("Rejection failed:", { error: result.error });
        throw new Error(result.error);
      }
    } catch (error) {
      logger.error("Error in handleReject:", error);
      throw error;
    }
  };

  const handleArchive = async () => {
    if (!proposal?.id || !user?.id) {
      logger.error("Cannot archive proposal: missing proposal ID or user ID", { action: 'archive' });
      return;
    }
    
    logger.info(`Archiving proposal: ${proposal.id} by user: ${user.id}`, { proposalId: proposal.id, userId: user.id });
    
    try {
      const result = await archiveProposal(proposal.id, user.id);
      if (result.success) {
        logger.info("Proposal archived successfully, refreshing data", { proposalId: proposal.id });
        // Refresh data from the server
        if (id) {
          await fetchProposal(id, token);
        }
        
        // Also update local state immediately for better UX
        setProposal(prev => prev ? {
          ...prev, 
          archived_at: new Date().toISOString(),
          archived_by: user.id,
          review_later_until: null
        } : null);
        
        setArchiveDialogOpen(false);
      } else {
        logger.error("Archiving failed:", { error: result.error });
        throw new Error(result.error);
      }
    } catch (error) {
      logger.error("Error in handleArchive:", error);
      throw error;
    }
  };

  const handleReviewLater = async () => {
    if (!proposal?.id) {
      logger.error("Cannot toggle review later: proposal ID is missing", { action: 'reviewLater' });
      return;
    }
    
    // Toggle review later status
    const isCurrentlyMarkedForReviewLater = !!proposal.review_later_until;
    logger.info(`Toggling review later status for proposal: ${proposal.id}, current status: ${isCurrentlyMarkedForReviewLater}`, 
      { proposalId: proposal.id, currentStatus: isCurrentlyMarkedForReviewLater });
    
    try {
      const result = await toggleReviewLater(proposal.id, isCurrentlyMarkedForReviewLater);
      
      if (result.success) {
        logger.info("Review later status updated successfully, refreshing data", { proposalId: proposal.id });
        // Refresh data from the server
        if (id) {
          await fetchProposal(id, token);
        }
        
        // Also update local state immediately for better UX
        setProposal(prev => prev ? {
          ...prev, 
          review_later_until: result.reviewLaterUntil || null
        } : null);
      } else {
        logger.error("Toggle review later failed:", { error: result.error });
        throw new Error(result.error);
      }
    } catch (error) {
      logger.error("Error in handleReviewLater:", error);
      throw error;
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
    clientEmail,
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
