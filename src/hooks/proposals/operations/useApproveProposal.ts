
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase/client";
import { createNotification } from "@/services/notificationService";
import { ProposalOperationResult } from "@/types/proposals";
import { useNavigate } from "react-router-dom";
import { useErrorHandler } from "@/hooks/useErrorHandler";
import { logger } from "@/lib/logger";

/**
 * Hook for approving proposals
 */
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

  const approveProposal = async (proposalId: string, typedName?: string): Promise<ProposalOperationResult> => {
    try {
      proposalLogger.info({ message: `Starting approval process for proposal: ${proposalId}`, proposalId, hasSignature: !!typedName });
      setLoadingState('approve', true);
      
      // Fetch the proposal to get agent_id and client info for notification
      const { data: proposals, error: fetchError } = await supabase
        .from('proposals')
        .select('agent_id, title, client_id, client_reference_id')
        .eq('id', proposalId);
        
      if (fetchError) {
        throw fetchError;
      }
      
      if (!proposals || proposals.length === 0) {
        throw new Error("Proposal not found");
      }
      
      const proposal = proposals[0];
      proposalLogger.info({ 
        message: "Fetched proposal details", 
        proposalId, 
        title: proposal.title, 
        agentId: proposal.agent_id 
      });
      
      // If we have a typed name, create the agreement record
      if (typedName) {
        try {
          // Get user info for audit trail
          const ipResponse = await fetch('https://api.ipify.org?format=json');
          const { ip } = await ipResponse.json();
          const userAgent = navigator.userAgent;

          const { error: agreementError } = await supabase
            .from('proposal_agreements')
            .insert({
              proposal_id: proposalId,
              signed_by: proposal.client_id || proposal.client_reference_id,
              signature_type: 'typed_name',
              typed_name: typedName,
              ip_address: ip,
              user_agent: userAgent,
              accepted_terms_version: '1.0',
              metadata: {
                signed_via: 'web_ui',
                browser: navigator.userAgent,
                timestamp: new Date().toISOString()
              }
            });

          if (agreementError) {
            proposalLogger.error({ message: "Failed to create agreement record", error: agreementError });
            throw new Error("Failed to create signature record");
          }
          
          proposalLogger.info({ message: "Agreement record created successfully", proposalId });
        } catch (agreementError) {
          // Log the error but continue with approval
          proposalLogger.error({ message: "Error creating agreement record", error: agreementError });
          throw agreementError;
        }
      }
      
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
      
      proposalLogger.info({ message: "Proposal approved successfully", proposalId });
      
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
          proposalLogger.info({ 
            message: "Agent notification created successfully", 
            agentId: proposal.agent_id 
          });
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
        proposalLogger.info({ message: "Navigating to proposals list after approval", proposalId });
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
