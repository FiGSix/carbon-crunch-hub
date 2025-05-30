
import { useCallback } from 'react';
import { useAuth } from '@/contexts/auth';
import { DashboardHelpers } from './types';

export function useDashboardHelpers(fetchProposals: () => Promise<void>): DashboardHelpers {
  const { user, profile } = useAuth();

  const getWelcomeMessage = useCallback(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning!";
    if (hour < 18) return "Good afternoon!";
    return "Good evening!";
  }, []);

  const getUserDisplayName = useCallback(() => {
    if (profile?.first_name && profile?.last_name) {
      return `${profile.first_name} ${profile.last_name}`;
    }
    if (profile?.first_name) {
      return profile.first_name;
    }
    if (user?.email) {
      return user.email;
    }
    return "User";
  }, [profile?.first_name, profile?.last_name, user?.email]);

  const formatUserRole = useCallback((role: string | null) => {
    if (!role) return "User";
    return role.charAt(0).toUpperCase() + role.slice(1);
  }, []);

  const handleRefreshProposals = useCallback(async () => {
    console.log("Dashboard: Refreshing proposals data");
    await fetchProposals();
  }, [fetchProposals]);

  return {
    getWelcomeMessage,
    getUserDisplayName,
    formatUserRole,
    handleRefreshProposals
  };
}
