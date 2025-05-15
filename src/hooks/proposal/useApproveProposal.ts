
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { createNotification } from "@/services/notificationService";
import { ProposalOperationResult } from "@/components/proposals/view/types";
import { useNavigate } from "react-router-dom";
import { useErrorHandler } from "@/hooks/useErrorHandler";
import { logger } from "@/lib/logger";

export function useApproveProposal(setLoadingState: (operation: 'approve', isLoading: boolean) => void) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { handleError } = useErrorHandler({
    context: "proposal-approval",
    toastOnError: true,
    navigateOnFatal: false
  });

  // Create a contextualized logger for this component
  const proposalLogger = logger.withContext({ 
    component: 'ApproveProposal', 
    feature: 'proposals' 
  });

  const approveProposal = async (proposalId: string): Promise<ProposalOperationResult> => {
    try {
      proposalLogger.info(`Starting approval process for proposal: ${proposalId}`, { proposalId });
      setLoadingState('approve', true);
      
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
      proposalLogger.info("Fetched proposal details", { 
        proposalId, 
        title: proposal.title, 
        agentId: proposal.agent_id 
      });
      
      // Update proposal status - ensuring we include the proposal ID in the query
      const { error } = await supabase
        .from('proposals')
        .update({ 
          status: 'approved',
          signed_at: new Date().toISOString(),
          review_later_until: null // Clear review later if approved
        })
        .eq('id', proposalId);
      
      if (error) {
        throw error;
      }
      
      proposalLogger.info("Proposal approved successfully", { proposalId });
      
      // Create notification for the agent - but don't let it block approval
      if (proposal?.agent_id) {
        try {
          await createNotification({
            userId: proposal.agent_id,
            title: "Proposal Approved",
            message: `The proposal "${proposal.title}" has been approved by the client.`,
            type: "success",
            relatedId: proposalId,
            relatedType: "proposal"
          });
          proposalLogger.info("Agent notification created successfully", { agentId: proposal.agent_id });
        } catch (notificationError) {
          // Log the error but don't throw - we still want the approval to succeed
          handleError(notificationError, "Failed to create notification", "warning");
        }
      }
      
      toast({
        title: "Proposal Approved",
        description: "Thank you for approving this proposal.",
      });
      
      // Dispatch event for other components to react to
      window.dispatchEvent(new CustomEvent('proposal-status-changed', { 
        detail: { id: proposalId, status: 'approved' }
      }));
      
      // Navigate back to proposals list after a short delay to allow the toast to be seen
      setTimeout(() => {
        proposalLogger.info("Navigating to proposals list after approval", { proposalId });
        navigate('/proposals');
      }, 1500);
      
      return { success: true };
    } catch (error) {
      const errorState = handleError(error, "Failed to approve proposal");
      return { 
        success: false, 
        error: errorState.message || "Failed to approve proposal" 
      };
    } finally {
      setLoadingState('approve', false);
    }
  };

  return { approveProposal };
}
