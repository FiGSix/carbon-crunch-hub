
import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";
import { ProposalData } from "@/types/proposals";

/**
 * Hook to handle marking proposal invitations as viewed
 */
export function useMarkInvitationViewed() {
  // Create a contextualized logger
  const invitationLogger = logger.withContext({
    component: 'MarkInvitationViewed',
    feature: 'proposals'
  });

  const markInvitationViewed = useCallback(async (token: string | null, proposal: ProposalData) => {
    if (token && proposal?.id && !proposal.invitation_viewed_at) {
      invitationLogger.info("Marking invitation as viewed for proposal", {
        proposalId: proposal.id
      });
      
      try {
        // Update the invitation_viewed_at timestamp
        const { error } = await supabase
          .from('proposals')
          .update({ invitation_viewed_at: new Date().toISOString() })
          .eq('id', proposal.id)
          .eq('invitation_token', token);
          
        if (error) {
          invitationLogger.error("Error marking invitation as viewed", { error });
          return false;
        }
          
        // Create notification for the agent that client viewed the proposal
        if (proposal.agent_id) {
          await supabase.functions.invoke('create-notification', {
            body: {
              userId: proposal.agent_id,
              title: "Proposal Viewed",
              message: `The client has viewed your proposal: ${proposal.title}`,
              type: "info",
              relatedId: proposal.id,
              relatedType: "proposal"
            }
          });
          invitationLogger.info("Agent notification sent for proposal view", { proposalId: proposal.id });
        }
        
        return true;
      } catch (error) {
        invitationLogger.error("Error in markInvitationViewed", { error });
        return false;
      }
    }
    return false;
  }, [invitationLogger]);

  return { markInvitationViewed };
}
