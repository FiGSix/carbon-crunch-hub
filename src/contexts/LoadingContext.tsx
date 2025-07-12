import React, { createContext, useContext, useState, ReactNode } from 'react';
import { GlobalLoadingBar } from '@/components/ui/enterprise-loading';

interface LoadingContextType {
  isGlobalLoading: boolean;
  setGlobalLoading: (loading: boolean) => void;
  startOperation: (operationName: string) => void;
  endOperation: (operationName: string) => void;
  currentOperations: string[];
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

interface LoadingProviderProps {
  children: ReactNode;
}

export function LoadingProvider({ children }: LoadingProviderProps) {
  const [operations, setOperations] = useState<Set<string>>(new Set());
  
  const startOperation = (operationName: string) => {
    setOperations(prev => new Set(prev).add(operationName));
  };
  
  const endOperation = (operationName: string) => {
    setOperations(prev => {
      const newSet = new Set(prev);
      newSet.delete(operationName);
      return newSet;
    });
  };
  
  const setGlobalLoading = (loading: boolean) => {
    if (loading) {
      startOperation('global');
    } else {
      endOperation('global');
    }
  };
  
  const isGlobalLoading = operations.size > 0;
  const currentOperations = Array.from(operations);
  
  return (
    <LoadingContext.Provider value={{
      isGlobalLoading,
      setGlobalLoading,
      startOperation,
      endOperation,
      currentOperations
    }}>
      <GlobalLoadingBar isLoading={isGlobalLoading} />
      {children}
    </LoadingContext.Provider>
  );
}

export function useLoading() {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error('useLoading must be used within a LoadingProvider');
  }
  return context;
}

/**
 * Hook for managing operation-specific loading states
 */
export function useOperationLoading() {
  const { startOperation, endOperation } = useLoading();
  
  const withLoading = async <T,>(
    operationName: string,
    asyncFunction: () => Promise<T>
  ): Promise<T> => {
    startOperation(operationName);
    try {
      return await asyncFunction();
    } finally {
      endOperation(operationName);
    }
  };
  
  return { withLoading };
}