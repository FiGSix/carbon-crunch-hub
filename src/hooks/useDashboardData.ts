
import { useMemo } from 'react';
import { useProposals } from './useProposals';
import { useAuth } from '@/contexts/auth';
import { useDashboardComputedData } from './dashboard/useDashboardComputedData';
import { useDashboardHelpers } from './dashboard/useDashboardHelpers';
import { DashboardData } from './dashboard/types';

export function useDashboardData(): DashboardData {
  const { proposals, loading, error, fetchProposals } = useProposals();
  const { userRole } = useAuth();
  
  // Get computed data using the new hook
  const computedData = useDashboardComputedData(proposals, userRole);
  
  // Get helper functions using the new hook
  const helpers = useDashboardHelpers(fetchProposals);

  // Memoize the final result to prevent unnecessary re-renders
  const result = useMemo((): DashboardData => ({
    // Auth data
    userRole,
    
    // Proposal data
    proposals,
    
    // Loading states
    loading,
    error,
    
    // Computed data
    ...computedData,
    
    // Helper functions
    ...helpers
  }), [
    userRole,
    proposals,
    loading,
    error,
    computedData,
    helpers
  ]);

  return result;
}
