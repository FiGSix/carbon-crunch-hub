
import { useProposalLoadingState } from "./useProposalLoadingState";
import { useApproveProposal } from "./useApproveProposal";
import { useRejectProposal } from "./useRejectProposal";
import { useArchiveProposal } from "./useArchiveProposal";
import { useReviewLaterProposal } from "./useReviewLaterProposal";

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
