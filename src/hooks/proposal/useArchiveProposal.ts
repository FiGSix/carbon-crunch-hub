
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { createNotification } from "@/services/notificationService";
import { ProposalOperationResult } from "@/components/proposals/view/types";

export function useArchiveProposal(setLoadingState: (operation: 'archive', isLoading: boolean) => void) {
  const { toast } = useToast();
  
  const archiveProposal = async (proposalId: string, userId: string): Promise<ProposalOperationResult> => {
    try {
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
      
      // Create notification for the relevant party
      // If agent archived, notify client; if client archived, notify agent
      const recipientId = userId === proposal?.client_id ? proposal?.agent_id : proposal?.client_id;
      
      if (recipientId) {
        await createNotification({
          userId: recipientId,
          title: "Proposal Archived",
          message: `The proposal "${proposal?.title}" has been archived.`,
          type: "info",
          relatedId: proposalId,
          relatedType: "proposal"
        });
      }
      
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
      setLoadingState('archive', false);
    }
  };

  return { archiveProposal };
}
