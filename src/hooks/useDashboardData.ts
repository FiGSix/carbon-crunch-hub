
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useProposals } from './useProposals';
import { useAuth } from '@/contexts/auth';
import { ProposalListItem } from '@/types/proposals';

interface DashboardStats {
  totalProposals: number;
  pendingProposals: number;
  approvedProposals: number;
  totalRevenue: number;
  totalEnergyOffset: number;
}

interface DashboardData {
  // Auth data
  userRole: string | null;
  
  // Proposal data
  proposals: ProposalListItem[];
  
  // Loading states
  loading: boolean;
  error: string | null;
  
  // Computed stats
  stats: DashboardStats;
  recentProposals: ProposalListItem[];
  chartData: ProposalListItem[];
  portfolioSize: number;
  totalProposals: number;
  potentialRevenue: number;
  co2Offset: number;
  
  // Helper functions
  getWelcomeMessage: () => string;
  getUserDisplayName: () => string;
  formatUserRole: (role: string | null) => string;
  handleRefreshProposals: () => Promise<void>;
}

export function useDashboardData(): DashboardData {
  const { proposals, loading, error, fetchProposals } = useProposals();
  const { userRole, user, profile } = useAuth();
  
  // Use ref to cache computed values and prevent unnecessary recalculations
  const computedDataRef = useRef<{
    proposals: ProposalListItem[];
    stats: DashboardStats;
    recentProposals: ProposalListItem[];
    chartData: ProposalListItem[];
  } | null>(null);

  // Memoized stats calculation with proper dependency tracking
  const stats = useMemo(() => {
    // Check if we can use cached data
    if (computedDataRef.current && 
        computedDataRef.current.proposals === proposals && 
        proposals.length > 0) {
      return computedDataRef.current.stats;
    }

    console.log("Recalculating dashboard stats for", proposals.length, "proposals");
    
    const newStats: DashboardStats = {
      totalProposals: proposals.length,
      pendingProposals: proposals.filter(p => p.status === 'pending' || p.status === 'draft').length,
      approvedProposals: proposals.filter(p => p.status === 'approved' || p.status === 'signed').length,
      totalRevenue: proposals.reduce((sum, p) => sum + (p.revenue || 0), 0),
      totalEnergyOffset: proposals.reduce((sum, p) => sum + (p.annual_energy || 0), 0)
    };

    return newStats;
  }, [proposals]);

  // Memoized recent proposals (last 5, sorted by date)
  const recentProposals = useMemo(() => {
    // Check if we can use cached data
    if (computedDataRef.current && 
        computedDataRef.current.proposals === proposals && 
        proposals.length > 0) {
      return computedDataRef.current.recentProposals;
    }

    const sorted = [...proposals]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5);
    
    return sorted;
  }, [proposals]);

  // Memoized chart data (proposals with revenue > 0)
  const chartData = useMemo(() => {
    // Check if we can use cached data
    if (computedDataRef.current && 
        computedDataRef.current.proposals === proposals && 
        proposals.length > 0) {
      return computedDataRef.current.chartData;
    }

    const filtered = proposals.filter(p => (p.revenue || 0) > 0);
    return filtered;
  }, [proposals]);

  // Computed values from stats
  const portfolioSize = useMemo(() => proposals.length, [proposals.length]);
  const totalProposals = useMemo(() => stats.totalProposals, [stats.totalProposals]);
  const potentialRevenue = useMemo(() => stats.totalRevenue, [stats.totalRevenue]);
  const co2Offset = useMemo(() => stats.totalEnergyOffset, [stats.totalEnergyOffset]);

  // Helper functions
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

  // Update cache when calculations are done
  useEffect(() => {
    if (proposals.length > 0) {
      computedDataRef.current = {
        proposals,
        stats,
        recentProposals,
        chartData
      };
    }
  }, [proposals, stats, recentProposals, chartData]);

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
    stats,
    recentProposals,
    chartData,
    portfolioSize,
    totalProposals,
    potentialRevenue,
    co2Offset,
    
    // Helper functions
    getWelcomeMessage,
    getUserDisplayName,
    formatUserRole,
    handleRefreshProposals
  }), [
    userRole,
    proposals,
    loading,
    error,
    stats,
    recentProposals,
    chartData,
    portfolioSize,
    totalProposals,
    potentialRevenue,
    co2Offset,
    getWelcomeMessage,
    getUserDisplayName,
    formatUserRole,
    handleRefreshProposals
  ]);

  return result;
}
