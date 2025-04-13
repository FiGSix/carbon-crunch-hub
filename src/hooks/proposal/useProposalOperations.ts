
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ProposalOperationResult } from "@/components/proposals/view/types";

export function useProposalOperations() {
  const { toast } = useToast();
  const [loading, setLoading] = useState<{
    approve: boolean;
    reject: boolean;
    archive: boolean;
    reviewLater: boolean;
  }>({
    approve: false,
    reject: false,
    archive: false,
    reviewLater: false,
  });

  const approveProposal = async (proposalId: string): Promise<ProposalOperationResult> => {
    try {
      setLoading(prev => ({ ...prev, approve: true }));
      
      const { error } = await supabase
        .from('proposals')
        .update({ 
          status: 'approved',
          signed_at: new Date().toISOString(),
          review_later_until: null // Clear review later if approved
        })
        .eq('id', proposalId);
      
      if (error) throw error;
      
      toast({
        title: "Proposal Approved",
        description: "Thank you for approving this proposal.",
      });
      
      return { success: true };
    } catch (error) {
      console.error("Error approving proposal:", error);
      toast({
        title: "Error",
        description: "Failed to approve proposal. Please try again.",
        variant: "destructive",
      });
      return { success: false, error: "Failed to approve proposal" };
    } finally {
      setLoading(prev => ({ ...prev, approve: false }));
    }
  };
  
  const rejectProposal = async (proposalId: string): Promise<ProposalOperationResult> => {
    try {
      setLoading(prev => ({ ...prev, reject: true }));
      
      const { error } = await supabase
        .from('proposals')
        .update({ 
          status: 'rejected',
          review_later_until: null // Clear review later if rejected
        })
        .eq('id', proposalId);
      
      if (error) throw error;
      
      toast({
        title: "Proposal Rejected",
        description: "The proposal has been rejected.",
      });
      
      return { success: true };
    } catch (error) {
      console.error("Error rejecting proposal:", error);
      toast({
        title: "Error",
        description: "Failed to reject proposal. Please try again.",
        variant: "destructive",
      });
      return { success: false, error: "Failed to reject proposal" };
    } finally {
      setLoading(prev => ({ ...prev, reject: false }));
    }
  };

  const archiveProposal = async (proposalId: string, userId: string): Promise<ProposalOperationResult> => {
    try {
      setLoading(prev => ({ ...prev, archive: true }));
      
      const { data, error } = await supabase
        .rpc('archive_proposal', { 
          proposal_id: proposalId, 
          user_id: userId 
        });
      
      if (error) throw error;
      
      if (!data) {
        throw new Error("Failed to archive proposal. You may not have permission to archive this proposal.");
      }
      
      // Also update review_later_until to null when archiving
      await supabase
        .from('proposals')
        .update({ review_later_until: null })
        .eq('id', proposalId);
      
      toast({
        title: "Proposal Archived",
        description: "The proposal has been successfully archived.",
      });
      
      return { success: true };
    } catch (error) {
      console.error("Error archiving proposal:", error);
      toast({
        title: "Error",
        description: "Failed to archive proposal. Please try again.",
        variant: "destructive",
      });
      return { success: false, error: "Failed to archive proposal" };
    } finally {
      setLoading(prev => ({ ...prev, archive: false }));
    }
  };

  const toggleReviewLater = async (proposalId: string, isCurrentlyMarkedForReviewLater: boolean): Promise<ProposalOperationResult> => {
    try {
      setLoading(prev => ({ ...prev, reviewLater: true }));
      
      // Set review later date to 30 days from now, or null if removing
      const reviewLaterUntil = isCurrentlyMarkedForReviewLater 
        ? null 
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      
      const { error } = await supabase
        .from('proposals')
        .update({ review_later_until: reviewLaterUntil })
        .eq('id', proposalId);
      
      if (error) throw error;
      
      toast({
        title: isCurrentlyMarkedForReviewLater ? "Removed from Review Later" : "Marked for Review Later",
        description: isCurrentlyMarkedForReviewLater 
          ? "This proposal has been removed from your Review Later list." 
          : "This proposal has been added to your Review Later list."
      });
      
      return { success: true, reviewLaterUntil };
    } catch (error) {
      console.error("Error updating review later status:", error);
      toast({
        title: "Error",
        description: "Failed to update review status. Please try again.",
        variant: "destructive",
      });
      return { success: false, error: "Failed to update review later status" };
    } finally {
      setLoading(prev => ({ ...prev, reviewLater: false }));
    }
  };

  return {
    loading,
    approveProposal,
    rejectProposal,
    archiveProposal,
    toggleReviewLater,
  };
}
