
import { useMemo } from "react";
import { useAuth } from "@/contexts/auth";
import { ProposalData } from "@/types/proposals";
import { useClientCompanyMembership } from "@/hooks/useClientCompanyMembership";

interface UseProposalStatusOptions {
  proposalClientCompanyId?: string | null;
}

// All statuses where a client can still take action (approve/reject)
// These represent stages before the proposal is signed, rejected, or archived
// Removed 'pending' - now includes 'draft' and 'stale' for full pre-signature coverage
const ACTIONABLE_STATUSES = ['draft', 'sent', 'delivered', 'opened', 'viewed', 'stale'];

/**
 * Hook to determine proposal status and user permissions
 * Now includes team member permissions for client companies
 */
export function useProposalStatus(
  proposal: ProposalData | null, 
  token?: string | null,
  options?: UseProposalStatusOptions
) {
  const { user, userRole } = useAuth();
  const { membership } = useClientCompanyMembership();

  return useMemo(() => {
    if (!proposal) {
      return {
        isClient: false,
        canTakeAction: false,
        isAuthenticated: !!user
      };
    }

    // Direct client match (existing logic)
    const isDirectClient = userRole === 'client' && (
      proposal.client_id === user?.id || 
      proposal.client_reference_id === user?.id
    );

    // Team member with signing rights - can act on behalf of company
    const proposalCompanyId = options?.proposalClientCompanyId;
    const isClientTeamMember = !!(
      userRole === 'client' &&
      membership &&
      proposalCompanyId &&
      membership.clientCompanyId === proposalCompanyId &&
      membership.canSignAgreements
    );

    // Token access without authentication = prospective client
    const isTokenAccess = !!token && !user;

    // Client is either direct match, team member with signing rights, or token access
    const isClient = isDirectClient || isClientTeamMember || isTokenAccess;
    
    // Can take action if:
    // 1. User is identified as client (direct, team member, or token access)
    // 2. Proposal is in an actionable status (not signed/rejected/archived)
    // 3. Not archived
    // 4. Not already signed
    const canTakeAction = isClient && 
      ACTIONABLE_STATUSES.includes(proposal.status) && 
      !proposal.archived_at &&
      !proposal.signed_at;

    // Debug logging
    console.log("🔍 useProposalStatus - Status Check", {
      proposalId: proposal.id,
      proposalStatus: proposal.status,
      isActionableStatus: ACTIONABLE_STATUSES.includes(proposal.status),
      hasToken: !!token,
      hasUser: !!user,
      userRole,
      isDirectClient,
      isClientTeamMember,
      isClient,
      canTakeAction,
      tokenAccess: isTokenAccess,
      proposalCompanyId,
      userCompanyId: membership?.clientCompanyId,
      canSignAgreements: membership?.canSignAgreements,
      archivedAt: proposal.archived_at,
      signedAt: proposal.signed_at
    });

    return {
      isClient,
      canTakeAction,
      isAuthenticated: !!user
    };
  }, [proposal, user, userRole, token, membership, options?.proposalClientCompanyId]);
}
