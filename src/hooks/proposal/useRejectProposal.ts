
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { createNotification } from "@/services/notificationService";
import { ProposalOperationResult } from "@/components/proposals/view/types";

export function useRejectProposal(setLoadingState: (operation: 'reject', isLoading: boolean) => void) {
  const { toast } = useToast();
  
  const rejectProposal = async (proposalId: string): Promise<ProposalOperationResult> => {
    try {
      setLoadingState('reject', true);
      
      // Fetch the proposal to get agent_id for notification
      const { data: proposals, error: fetchError } = await supabase
        .from('proposals')
        .select('agent_id, title')
        .eq('id', proposalId);
        
      if (fetchError) throw fetchError;
      
      if (!proposals || proposals.length === 0) {
        throw new Error("Proposal not found");
      }
      
      const proposal = proposals[0];
      
      const { error } = await supabase
        .from('proposals')
        .update({ 
          status: 'rejected',
          review_later_until: null // Clear review later if rejected
        })
        .eq('id', proposalId);
      
      if (error) throw error;
      
      // Create notification for the agent
      if (proposal?.agent_id) {
        await createNotification({
          userId: proposal.agent_id,
          title: "Proposal Rejected",
          message: `The proposal "${proposal.title}" has been rejected by the client.`,
          type: "warning",
          relatedId: proposalId,
          relatedType: "proposal"
        });
      }
      
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
      setLoadingState('reject', false);
    }
  };

  return { rejectProposal };
}
