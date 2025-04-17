
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { createNotification } from "@/services/notificationService";
import { ProposalOperationResult } from "@/components/proposals/view/types";

export function useApproveProposal(setLoadingState: (operation: 'approve', isLoading: boolean) => void) {
  const { toast } = useToast();

  const approveProposal = async (proposalId: string): Promise<ProposalOperationResult> => {
    try {
      setLoadingState('approve', true);
      
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
        console.error("Error updating proposal status:", error);
        throw error;
      }
      
      console.log("Proposal approved successfully:", proposalId);
      
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
        } catch (notificationError) {
          // Log the error but don't throw - we still want the approval to succeed
          console.error("Error creating notification (non-blocking):", notificationError);
        }
      }
      
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
      setLoadingState('approve', false);
    }
  };

  return { approveProposal };
}
