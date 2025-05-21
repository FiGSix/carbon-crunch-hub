
import { useMemo } from "react";
import { ProposalData } from "@/types/proposals";
import { useAuth } from "@/contexts/auth";
import { logger } from "@/lib/logger";

/**
 * Hook to determine various proposal statuses and permissions
 */
export function useProposalStatus(proposal: ProposalData | null) {
  const { user } = useAuth();
  
  // Create a contextualized logger
  const statusLogger = logger.withContext({
    component: 'useProposalStatus',
    feature: 'proposals'
  });

  return useMemo(() => {
    if (!proposal) {
      return {
        canArchive: false,
        isReviewLater: false,
        isClient: false,
        canTakeAction: false,
        isAuthenticated: !!user
      };
    }

    const userId = user?.id;
    
    // Check if current user is the client for this proposal
    // This handles both registered clients (client_id) and client contacts
    const isClient = !!userId && (
      userId === proposal.client_id || 
      userId === proposal.client_contact_id
    );
    
    // For debugging permission issues
    if (userId) {
      statusLogger.debug("Checking client status", { 
        userId,
        proposalClientId: proposal.client_id,
        proposalClientContactId: proposal.client_contact_id,
        isClient
      });
    }
    
    // Check if user can archive the proposal - requires authentication
    const canArchive = !!userId && !proposal.archived_at && 
      (isClient || userId === proposal.agent_id);
      
    const isReviewLater = !!proposal.review_later_until;
    
    // Check if client can take action on the proposal
    // Requires user to be logged in AND be the client
    const canTakeAction = isClient && 
      proposal.status === 'pending' && 
      !proposal.archived_at && 
      !isReviewLater;

    return {
      canArchive,
      isReviewLater,
      isClient,
      canTakeAction,
      isAuthenticated: !!user
    };
  }, [user, proposal, statusLogger]);
}
