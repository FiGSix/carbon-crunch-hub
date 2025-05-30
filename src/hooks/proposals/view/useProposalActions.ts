
import { useState } from "react";
import { useProposalOperations } from "../useProposalOperations";
import { logger } from "@/lib/logger";

/**
 * Hook for handling proposal action operations (approve, reject, delete)
 */
export function useProposalActions(refreshData: () => Promise<void>, onDeleteSuccess?: () => void) {
  const { loading: operationLoading, approveProposal, rejectProposal, deleteProposal, toggleReviewLater } = useProposalOperations();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Create a contextualized logger
  const actionsLogger = logger.withContext({ 
    component: 'ProposalActions', 
    feature: 'proposals' 
  });

  const handleApprove = async (proposalId: string) => {
    if (!proposalId) {
      actionsLogger.error({ message: "Cannot approve proposal", action: 'approve', reason: 'missing proposal ID' });
      return false;
    }
    
    actionsLogger.info({ message: "Approving proposal", proposalId });
    
    try {
      const result = await approveProposal(proposalId);
      if (result.success) {
        actionsLogger.info({ message: "Proposal approved successfully, refreshing data", proposalId });
        // Refresh data from the server
        await refreshData();
        
        // Force trigger a global event to notify other components
        window.dispatchEvent(new CustomEvent('proposal-status-changed', { 
          detail: { id: proposalId, status: 'approved' }
        }));
        
        return true;
      } else {
        actionsLogger.error({ message: "Approval failed", error: result.error });
        throw new Error(result.error);
      }
    } catch (error) {
      actionsLogger.error({ message: "Error in handleApprove", error });
      throw error;
    }
  };
  
  const handleReject = async (proposalId: string) => {
    if (!proposalId) {
      actionsLogger.error({ message: "Cannot reject proposal", action: 'reject', reason: 'missing proposal ID' });
      return false;
    }
    
    actionsLogger.info({ message: "Rejecting proposal", proposalId });
    
    try {
      const result = await rejectProposal(proposalId);
      if (result.success) {
        actionsLogger.info({ message: "Proposal rejected successfully, refreshing data", proposalId });
        // Refresh data from the server
        await refreshData();
        
        // Force trigger a global event to notify other components
        window.dispatchEvent(new CustomEvent('proposal-status-changed', { 
          detail: { id: proposalId, status: 'rejected' }
        }));
        
        return true;
      } else {
        actionsLogger.error({ message: "Rejection failed", error: result.error });
        throw new Error(result.error);
      }
    } catch (error) {
      actionsLogger.error({ message: "Error in handleReject", error });
      throw error;
    }
  };

  const handleDelete = async (proposalId: string, userId: string) => {
    if (!proposalId || !userId) {
      actionsLogger.error({ message: "Cannot delete proposal", action: 'delete', reason: 'missing proposal ID or user ID' });
      return false;
    }
    
    actionsLogger.info({ message: "Deleting proposal", proposalId, userId });
    
    try {
      const result = await deleteProposal(proposalId, userId);
      if (result.success) {
        actionsLogger.info({ message: "Proposal deleted successfully", proposalId });
        
        setDeleteDialogOpen(false);
        
        // Call the success callback if provided (for navigation)
        if (onDeleteSuccess) {
          actionsLogger.info({ message: "Executing delete success callback", proposalId });
          onDeleteSuccess();
        } else {
          // If no callback provided, refresh data as fallback
          await refreshData();
        }
        
        return true;
      } else {
        actionsLogger.error({ message: "Deletion failed", error: result.error });
        throw new Error(result.error);
      }
    } catch (error) {
      actionsLogger.error({ message: "Error in handleDelete", error });
      throw error;
    }
  };

  const handleReviewLater = async (proposalId: string, isCurrentlyMarkedForReviewLater: boolean) => {
    if (!proposalId) {
      actionsLogger.error({ message: "Cannot toggle review later", action: 'reviewLater', reason: 'missing proposal ID' });
      return false;
    }
    
    actionsLogger.info({ 
      message: "Toggling review later status for proposal", 
      proposalId, 
      currentStatus: isCurrentlyMarkedForReviewLater 
    });
    
    try {
      const result = await toggleReviewLater(proposalId, isCurrentlyMarkedForReviewLater);
      
      if (result.success) {
        actionsLogger.info({ message: "Review later status updated successfully, refreshing data", proposalId });
        // Refresh data from the server
        await refreshData();
        
        return true;
      } else {
        actionsLogger.error({ message: "Toggle review later failed", error: result.error });
        throw new Error(result.error);
      }
    } catch (error) {
      actionsLogger.error({ message: "Error in handleReviewLater", error });
      throw error;
    }
  };

  return {
    handleApprove,
    handleReject,
    handleDelete,
    handleReviewLater,
    deleteDialogOpen,
    setDeleteDialogOpen,
    deleteLoading: operationLoading.delete
  };
}
