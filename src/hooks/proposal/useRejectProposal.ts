
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { createNotification } from "@/services/notificationService";
import { ProposalOperationResult } from "@/components/proposals/view/types";
import { logger } from "@/lib/logger";

export function useRejectProposal(setLoadingState: (operation: 'reject', isLoading: boolean) => void) {
  const { toast } = useToast();
  
  const rejectProposal = async (proposalId: string): Promise<ProposalOperationResult> => {
    try {
      logger.info(`Starting rejection process for proposal: ${proposalId}`);
      setLoadingState('reject', true);
      
      // Fetch the proposal to get agent_id for notification
      const { data: proposals, error: fetchError } = await supabase
        .from('proposals')
        .select('agent_id, title, client_id')
        .eq('id', proposalId);
        
      if (fetchError) {
        logger.error("Error fetching proposal details:", fetchError);
        throw fetchError;
      }
      
      if (!proposals || proposals.length === 0) {
        const notFoundError = new Error("Proposal not found");
        logger.error(notFoundError.message);
        throw notFoundError;
      }
      
      const proposal = proposals[0];
      logger.info("Fetched proposal details:", { title: proposal.title, agentId: proposal.agent_id });
      
      const { error } = await supabase
        .from('proposals')
        .update({ 
          status: 'rejected',
          review_later_until: null // Clear review later if rejected
        })
        .eq('id', proposalId);
      
      if (error) {
        logger.error("Error updating proposal status:", error);
        throw error;
      }
      
      logger.info("Proposal rejected successfully:", proposalId);
      
      // Create notification for the agent
      if (proposal?.agent_id) {
        try {
          await createNotification({
            userId: proposal.agent_id,
            title: "Proposal Rejected",
            message: `The proposal "${proposal.title}" has been rejected by the client.`,
            type: "warning",
            relatedId: proposalId,
            relatedType: "proposal"
          });
          logger.info("Agent notification created successfully");
        } catch (notificationError) {
          // Log the error but don't throw - we still want the rejection to succeed
          logger.error("Error creating notification (non-blocking):", notificationError);
        }
      }
      
      toast({
        title: "Proposal Rejected",
        description: "The proposal has been rejected.",
      });
      
      // Dispatch event for other components to react to
      window.dispatchEvent(new CustomEvent('proposal-status-changed', { 
        detail: { id: proposalId, status: 'rejected' }
      }));
      
      return { success: true };
    } catch (error) {
      logger.error("Error rejecting proposal:", error);
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
