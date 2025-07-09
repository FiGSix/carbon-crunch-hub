import { useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/auth';
import { useQueryClient } from '@tanstack/react-query';

/**
 * Optimized dashboard helper functions with stable references
 */
export function useDashboardHelpers(refreshFunction?: () => void) {
  const { userRole, profile } = useAuth();
  const queryClient = useQueryClient();

  // Stable helper functions with useCallback
  const getWelcomeMessage = useCallback(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning!';
    if (hour < 18) return 'Good afternoon!';
    return 'Good evening!';
  }, []);

  const getUserDisplayName = useCallback(() => {
    if (profile?.first_name || profile?.last_name) {
      return `${profile.first_name || ''} ${profile.last_name || ''}`.trim();
    }
    return profile?.email?.split('@')[0] || 'User';
  }, [profile?.first_name, profile?.last_name, profile?.email]);

  const formatUserRole = useCallback((role: string | null) => {
    if (!role) return '';
    return role.charAt(0).toUpperCase() + role.slice(1);
  }, []);

  const handleRefreshProposals = useCallback(async () => {
    // Invalidate all dashboard-related queries for fresh data
    queryClient.invalidateQueries({ queryKey: ['unified-dashboard-data'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard-stats-optimized'] });
    queryClient.invalidateQueries({ queryKey: ['agent-portfolio-optimized'] });
    
    // Call custom refresh function if provided
    if (refreshFunction) {
      try {
        await refreshFunction();
      } catch (error) {
        console.error('Error refreshing data:', error);
      }
    }
  }, [queryClient, refreshFunction]);

  // Memoize the return object to prevent unnecessary re-renders
  return useMemo(() => ({
    getWelcomeMessage,
    getUserDisplayName,
    formatUserRole,
    handleRefreshProposals
  }), [getWelcomeMessage, getUserDisplayName, formatUserRole, handleRefreshProposals]);
}