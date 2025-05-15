
import { useState } from "react";
import { useProposalOperations } from "./useProposalOperations";
import { logger } from "@/lib/logger";

/**
 * Hook for handling proposal action operations (approve, reject, archive)
 */
export function useProposalActions() {
  const { loading: operationLoading, approveProposal, rejectProposal, archiveProposal, toggleReviewLater } = useProposalOperations();
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);

  const handleApprove = async (proposalId: string, refreshData: () => Promise<void>) => {
    if (!proposalId) {
      logger.error("Cannot approve proposal", { action: 'approve', reason: 'missing proposal ID' });
      return;
    }
    
    logger.info("Approving proposal", { proposalId });
    
    try {
      const result = await approveProposal(proposalId);
      if (result.success) {
        logger.info("Proposal approved successfully, refreshing data", { proposalId });
        // Refresh data from the server
        await refreshData();
        
        // Force trigger a global event to notify other components
        window.dispatchEvent(new CustomEvent('proposal-status-changed', { 
          detail: { id: proposalId, status: 'approved' }
        }));
        
        return true;
      } else {
        logger.error("Approval failed", { error: result.error });
        throw new Error(result.error);
      }
    } catch (error) {
      logger.error("Error in handleApprove", { error });
      throw error;
    }
  };
  
  const handleReject = async (proposalId: string, refreshData: () => Promise<void>) => {
    if (!proposalId) {
      logger.error("Cannot reject proposal", { action: 'reject', reason: 'missing proposal ID' });
      return;
    }
    
    logger.info("Rejecting proposal", { proposalId });
    
    try {
      const result = await rejectProposal(proposalId);
      if (result.success) {
        logger.info("Proposal rejected successfully, refreshing data", { proposalId });
        // Refresh data from the server
        await refreshData();
        
        // Force trigger a global event to notify other components
        window.dispatchEvent(new CustomEvent('proposal-status-changed', { 
          detail: { id: proposalId, status: 'rejected' }
        }));
        
        return true;
      } else {
        logger.error("Rejection failed", { error: result.error });
        throw new Error(result.error);
      }
    } catch (error) {
      logger.error("Error in handleReject", { error });
      throw error;
    }
  };

  const handleArchive = async (proposalId: string, userId: string, refreshData: () => Promise<void>) => {
    if (!proposalId || !userId) {
      logger.error("Cannot archive proposal", { action: 'archive', reason: 'missing proposal ID or user ID' });
      return;
    }
    
    logger.info("Archiving proposal", { proposalId, userId });
    
    try {
      const result = await archiveProposal(proposalId, userId);
      if (result.success) {
        logger.info("Proposal archived successfully, refreshing data", { proposalId });
        // Refresh data from the server
        await refreshData();
        
        setArchiveDialogOpen(false);
        return true;
      } else {
        logger.error("Archiving failed", { error: result.error });
        throw new Error(result.error);
      }
    } catch (error) {
      logger.error("Error in handleArchive", { error });
      throw error;
    }
  };

  const handleReviewLater = async (proposalId: string, isCurrentlyMarkedForReviewLater: boolean, refreshData: () => Promise<void>) => {
    if (!proposalId) {
      logger.error("Cannot toggle review later", { action: 'reviewLater', reason: 'missing proposal ID' });
      return;
    }
    
    logger.info("Toggling review later status for proposal", { 
      proposalId, 
      currentStatus: isCurrentlyMarkedForReviewLater 
    });
    
    try {
      const result = await toggleReviewLater(proposalId, isCurrentlyMarkedForReviewLater);
      
      if (result.success) {
        logger.info("Review later status updated successfully, refreshing data", { proposalId });
        // Refresh data from the server
        await refreshData();
        
        return true;
      } else {
        logger.error("Toggle review later failed", { error: result.error });
        throw new Error(result.error);
      }
    } catch (error) {
      logger.error("Error in handleReviewLater", { error });
      throw error;
    }
  };

  return {
    handleApprove,
    handleReject,
    handleArchive,
    handleReviewLater,
    archiveDialogOpen,
    setArchiveDialogOpen,
    archiveLoading: operationLoading.archive
  };
}
