
import { useMemo } from "react";
import { ProposalData } from "@/types/proposals";
import { useAuth } from "@/contexts/auth";

/**
 * Hook to determine various proposal statuses and permissions
 */
export function useProposalStatus(proposal: ProposalData | null) {
  const { user } = useAuth();

  return useMemo(() => {
    if (!proposal) {
      return {
        canArchive: false,
        isReviewLater: false,
        isClient: false,
        canTakeAction: false
      };
    }

    const isClient = !!user && user.id === proposal.client_id;
    const canArchive = !!user && !proposal.archived_at && 
      (user.id === proposal.client_id || user.id === proposal.agent_id);
    const isReviewLater = !!proposal.review_later_until;
    const canTakeAction = isClient && 
      proposal.status === 'pending' && 
      !proposal.archived_at && 
      !isReviewLater;

    return {
      canArchive,
      isReviewLater,
      isClient,
      canTakeAction
    };
  }, [user, proposal]);
}
