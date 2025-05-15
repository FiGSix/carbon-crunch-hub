
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { createNotification } from "@/services/notificationService";
import { ProposalOperationResult } from "@/components/proposals/view/types";
import { logger } from "@/lib/logger";
import { useErrorHandler } from "@/hooks/useErrorHandler";

export function useRejectProposal(setLoadingState: (operation: 'reject', isLoading: boolean) => void) {
  const { toast } = useToast();
  const { handleError } = useErrorHandler({
    context: "proposal-rejection",
    toastOnError: true,
    navigateOnFatal: false
  });
  
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
        throw fetchError;
      }
      
      if (!proposals || proposals.length === 0) {
        throw new Error("Proposal not found");
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
          handleError(notificationError, "Failed to create notification", "warning");
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
      const errorState = handleError(error, "Failed to reject proposal");
      return { 
        success: false, 
        error: errorState.message || "Failed to reject proposal" 
      };
    } finally {
      setLoadingState('reject', false);
    }
  };

  return { rejectProposal };
}

