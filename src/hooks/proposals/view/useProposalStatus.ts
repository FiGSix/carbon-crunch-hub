
import { useMemo } from "react";
import { useAuth } from "@/contexts/auth";
import { ProposalData } from "@/types/proposals";

/**
 * Hook to determine proposal status and user permissions
 */
export function useProposalStatus(proposal: ProposalData | null) {
  const { user, userRole } = useAuth();

  return useMemo(() => {
    if (!proposal || !user) {
      return {
        canDelete: false,
        isReviewLater: false,
        isClient: false,
        canTakeAction: false,
        isAuthenticated: false
      };
    }

    const isClient = userRole === 'client' && (
      proposal.client_id === user.id || 
      proposal.client_reference_id === user.id
    );
    
    const isAgent = userRole === 'agent' && proposal.agent_id === user.id;
    const isAdmin = userRole === 'admin';
    
    // Users can delete if they are the client, agent, or admin
    const canDelete = isClient || isAgent || isAdmin;
    
    // Check if proposal is marked for review later
    const isReviewLater = !!proposal.review_later_until && 
      new Date(proposal.review_later_until) > new Date();
    
    // Can take action (approve/reject) if client and proposal is pending
    const canTakeAction = isClient && 
      proposal.status === 'pending' && 
      !proposal.archived_at && 
      !isReviewLater;

    return {
      canDelete,
      isReviewLater,
      isClient,
      canTakeAction,
      isAuthenticated: !!user
    };
  }, [proposal, user, userRole]);
}
