
import { useState } from "react";

type OperationType = 'approve' | 'reject' | 'archive' | 'reviewLater';

interface LoadingState {
  approve: boolean;
  reject: boolean;
  archive: boolean;
  reviewLater: boolean;
}

/**
 * Hook to manage loading states for proposal operations
 */
export function useProposalLoadingState() {
  const [loading, setLoading] = useState<LoadingState>({
    approve: false,
    reject: false,
    archive: false,
    reviewLater: false
  });

  const setLoadingState = (operation: OperationType, isLoading: boolean) => {
    setLoading(prev => ({ ...prev, [operation]: isLoading }));
  };

  return { loading, setLoadingState };
}
