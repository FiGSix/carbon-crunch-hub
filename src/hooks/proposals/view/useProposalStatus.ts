
import { useMemo } from "react";
import { useAuth } from "@/contexts/auth";
import { ProposalData } from "@/types/proposals";

/**
 * Hook to determine proposal status and user permissions
 */
export function useProposalStatus(proposal: ProposalData | null, token?: string | null) {
  const { user, userRole } = useAuth();

  return useMemo(() => {
    if (!proposal) {
      return {
        isClient: false,
        canTakeAction: false,
        isAuthenticated: !!user
      };
    }

    // Client is either:
    // 1. Authenticated as client with matching ID
    // 2. Accessing via invitation token (prospective client)
    const isClient = (
      (userRole === 'client' && (
        proposal.client_id === user.id || 
        proposal.client_reference_id === user.id
      )) ||
      (!!token && !user) // Token access without authentication = prospective client
    );
    
    // Can take action (approve/reject) if client and proposal is pending
    const canTakeAction = isClient && 
      proposal.status === 'pending' && 
      !proposal.archived_at;

    // Debug logging
    console.log("🔍 useProposalStatus - Status Check", {
      proposalId: proposal.id,
      hasToken: !!token,
      hasUser: !!user,
      userRole,
      isClient,
      canTakeAction,
      tokenAccess: !!token && !user
    });

    return {
      isClient,
      canTakeAction,
      isAuthenticated: !!user
    };
  }, [proposal, user, userRole, token]);
}
