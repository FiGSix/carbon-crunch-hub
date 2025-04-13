
import { useState } from "react";

export type ProposalOperationsLoadingState = {
  approve: boolean;
  reject: boolean;
  archive: boolean;
  reviewLater: boolean;
};

export function useProposalLoadingState() {
  const [loading, setLoading] = useState<ProposalOperationsLoadingState>({
    approve: false,
    reject: false,
    archive: false,
    reviewLater: false,
  });

  const setLoadingState = (operation: keyof ProposalOperationsLoadingState, isLoading: boolean) => {
    setLoading(prev => ({ ...prev, [operation]: isLoading }));
  };

  return {
    loading,
    setLoadingState
  };
}
