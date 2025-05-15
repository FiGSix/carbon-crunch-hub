
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase/client";
import { createNotification } from "@/services/notificationService";
import { ProposalOperationResult } from "@/types/proposals";
import { useErrorHandler } from "@/hooks/useErrorHandler";
import { logger } from "@/lib/logger";

/**
 * Hook for archiving proposals
 */
export function useArchiveProposal(setLoadingState: (operation: 'archive', isLoading: boolean) => void) {
  const { toast } = useToast();
  const { handleError } = useErrorHandler({
    context: "proposal-archival",
    toastOnError: true,
    navigateOnFatal: false
  });
  
  // Create a contextualized logger for this component
  const proposalLogger = logger.withContext({ 
    component: 'ArchiveProposal', 
    feature: 'proposals' 
  });
  
  const archiveProposal = async (proposalId: string, userId: string): Promise<ProposalOperationResult> => {
    try {
      proposalLogger.info({ message: `Starting archive process for proposal: ${proposalId}`, proposalId, userId });
      setLoadingState('archive', true);
      
      // Fetch the proposal for notification
      const { data: proposals, error: fetchError } = await supabase
        .from('proposals')
        .select('client_id, agent_id, title')
        .eq('id', proposalId);
        
      if (fetchError) throw fetchError;
      
      if (!proposals || proposals.length === 0) {
        throw new Error("Proposal not found");
      }
      
      const proposal = proposals[0];
      
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
      
      proposalLogger.info({ message: "Proposal archived successfully", proposalId });
      
      // Create notification for the relevant party
      // If agent archived, notify client; if client archived, notify agent
      const recipientId = userId === proposal?.client_id ? proposal?.agent_id : proposal?.client_id;
      
      if (recipientId) {
        try {
          await createNotification({
            userId: recipientId,
            title: "Proposal Archived",
            message: `The proposal "${proposal?.title}" has been archived.`,
            type: "info",
            relatedId: proposalId,
            relatedType: "proposal"
          });
          proposalLogger.info({ message: "Notification sent to recipient", recipientId });
        } catch (notificationError) {
          // Log but don't block the main operation
          handleError(notificationError, "Failed to send notification", "warning");
        }
      }
      
      toast({
        title: "Proposal Archived",
        description: "The proposal has been successfully archived.",
      });
      
      return { success: true };
    } catch (error) {
      const errorState = handleError(error, "Failed to archive proposal");
      return { 
        success: false, 
        error: errorState.message || "Failed to archive proposal" 
      };
    } finally {
      setLoadingState('archive', false);
    }
  };

  return { archiveProposal };
}
