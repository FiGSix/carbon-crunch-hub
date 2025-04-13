
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ProposalOperationResult } from "@/components/proposals/view/types";

export function useReviewLaterProposal(setLoadingState: (operation: 'reviewLater', isLoading: boolean) => void) {
  const { toast } = useToast();
  
  const toggleReviewLater = async (proposalId: string, isCurrentlyMarkedForReviewLater: boolean): Promise<ProposalOperationResult> => {
    try {
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
      console.error("Error updating review later status:", error);
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
