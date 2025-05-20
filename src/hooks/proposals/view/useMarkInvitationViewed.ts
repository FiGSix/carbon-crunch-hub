
import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ProposalData } from "@/types/proposals";
import { logger } from "@/lib/logger";

/**
 * Hook to mark a proposal invitation as viewed
 */
export function useMarkInvitationViewed() {
  const markLogger = logger.withContext({
    component: 'useMarkInvitationViewed',
    feature: 'proposals'
  });

  const markInvitationViewed = useCallback(async (token: string, proposal: ProposalData) => {
    try {
      markLogger.info("Marking invitation as viewed", { 
        proposalId: proposal.id,
        tokenPrefix: token.substring(0, 5) + "..."
      });
      
      // First, set the token in the edge function context
      await supabase.functions.invoke('set-invitation-token', {
        body: { token }
      });
      
      // Then update the proposal to mark it as viewed
      const { error } = await supabase
        .from('proposals')
        .update({
          invitation_viewed_at: new Date().toISOString()
        })
        .eq('id', proposal.id);
      
      if (error) {
        markLogger.error("Failed to mark invitation as viewed", { 
          error: error.message,
          proposalId: proposal.id
        });
        throw error;
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
