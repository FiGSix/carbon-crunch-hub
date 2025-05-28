
import { useState } from 'react';

// Define the possible loading operations
type LoadingOperation = 'approve' | 'reject' | 'delete' | 'reviewLater';

interface LoadingState {
  approve: boolean;
  reject: boolean;
  delete: boolean;
  reviewLater: boolean;
}

/**
 * Hook for managing loading states for proposal operations
 */
export function useProposalLoadingState() {
  const [loading, setLoading] = useState<LoadingState>({
    approve: false,
    reject: false,
    delete: false,
    reviewLater: false,
  });

  const setLoadingState = (operation: LoadingOperation, isLoading: boolean) => {
    setLoading(prev => ({
      ...prev,
      [operation]: isLoading
    }));
  };

  return {
    loading,
    setLoadingState
  };
}
