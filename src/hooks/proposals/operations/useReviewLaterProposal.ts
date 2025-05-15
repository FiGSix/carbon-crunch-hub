
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase/client";
import { ProposalOperationResult } from "@/types/proposals";
import { logger } from "@/lib/logger";

/**
 * Hook to mark proposals for review later
 */
export function useReviewLaterProposal(setLoadingState: (operation: 'reviewLater', isLoading: boolean) => void) {
  const { toast } = useToast();
  
  // Create a contextualized logger
  const proposalLogger = logger.withContext({ 
    component: 'ReviewLaterProposal', 
    feature: 'proposals' 
  });
  
  const toggleReviewLater = async (proposalId: string, isCurrentlyMarkedForReviewLater: boolean): Promise<ProposalOperationResult> => {
    try {
      proposalLogger.info({ 
        message: "Toggling review later status", 
        proposalId, 
        currentStatus: isCurrentlyMarkedForReviewLater 
      });
      
      setLoadingState('reviewLater', true);
      
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
      proposalLogger.error({ message: "Error updating review later status", error });
      toast({
        title: "Error",
        description: "Failed to update review status. Please try again.",
        variant: "destructive",
      });
      return { success: false, error: "Failed to update review later status" };
    } finally {
      setLoadingState('reviewLater', false);
    }
  };

  return { toggleReviewLater };
}
