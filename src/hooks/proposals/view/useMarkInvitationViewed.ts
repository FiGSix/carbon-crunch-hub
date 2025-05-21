
import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ProposalData } from "@/types/proposals";
import { logger } from "@/lib/logger";

/**
 * Hook to mark a proposal invitation as viewed
 * This is now a backup method since we're marking viewed status
 * directly in the get_proposal_by_token function
 */
export function useMarkInvitationViewed() {
  const markLogger = logger.withContext({
    component: 'useMarkInvitationViewed',
    feature: 'proposals'
  });

  const markInvitationViewed = useCallback(async (token: string, proposal: ProposalData) => {
    try {
      markLogger.info("Marking invitation as viewed (backup method)", { 
        proposalId: proposal.id,
        tokenPrefix: token.substring(0, 5) + "..."
      });
      
      // Use the dedicated RPC function
      const { error } = await supabase.rpc('mark_invitation_viewed', {
        token_param: token
      });
      
      if (error) {
        markLogger.error("Failed to mark invitation as viewed", { 
          error: error.message,
          proposalId: proposal.id
        });
        return false;
      }
      
      markLogger.info("Successfully marked invitation as viewed", { 
        proposalId: proposal.id 
      });
      
      return true;
    } catch (error: any) {
      markLogger.error("Error marking invitation as viewed", {
        error: error.message,
        proposalId: proposal.id
      });
      return false;
    }
  }, [markLogger]);
  
  return { markInvitationViewed };
}
