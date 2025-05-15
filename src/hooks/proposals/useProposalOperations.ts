
import { useProposalLoadingState } from "./operations/useProposalLoadingState";
import { useApproveProposal } from "./operations/useApproveProposal";
import { useRejectProposal } from "./operations/useRejectProposal";
import { useArchiveProposal } from "./operations/useArchiveProposal";
import { useReviewLaterProposal } from "./operations/useReviewLaterProposal";

/**
 * Aggregates all proposal operation hooks
 * This hook provides a unified interface for all proposal operations
 */
export function useProposalOperations() {
  const { loading, setLoadingState } = useProposalLoadingState();
  const { approveProposal } = useApproveProposal(setLoadingState);
  const { rejectProposal } = useRejectProposal(setLoadingState);
  const { archiveProposal } = useArchiveProposal(setLoadingState);
  const { toggleReviewLater } = useReviewLaterProposal(setLoadingState);

  return {
    loading,
    approveProposal,
    rejectProposal,
    archiveProposal,
    toggleReviewLater,
  };
}
