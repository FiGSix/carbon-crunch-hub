
import { useState, useEffect, useCallback } from 'react';
import { DataService } from '@/services/dataService';
import { UserProfile } from '@/contexts/auth/types';
import { ProposalListItem } from '@/types/proposals';
import { useToast } from '@/hooks/use-toast';

interface UseOptimizedDataOptions {
  userId?: string;
  userRole?: string;
  enableRealtime?: boolean;
  refetchInterval?: number;
}

interface DashboardData {
  proposals: ProposalListItem[];
  portfolioSize: number;
  totalRevenue: number;
  co2Offset: number;
}

export function useOptimizedData({
  userId,
  userRole,
  enableRealtime = false,
  refetchInterval
}: UseOptimizedDataOptions = {}) {
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    proposals: [],
    portfolioSize: 0,
    totalRevenue: 0,
    co2Offset: 0
  });
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Optimized data fetching
  const fetchData = useCallback(async (forceRefresh = false) => {
    if (!userId || !userRole) return;

    setLoading(true);
    setError(null);

    try {
      const [profileData, dashboardInfo] = await Promise.all([
        DataService.getProfile(userId, forceRefresh),
        DataService.getDashboardData(userId, userRole)
      ]);

      setProfile(profileData);
      setDashboardData(dashboardInfo);
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to fetch data';
      setError(errorMessage);
      console.error('Data fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [userId, userRole]);

  // Update profile with optimized cache invalidation
  const updateProfile = useCallback(async (updates: Partial<UserProfile>) => {
    if (!userId) return { success: false, error: 'No user ID' };

    try {
      const result = await DataService.updateProfile(userId, updates);
      
      if (result.success) {
        // Optimistically update local state
        setProfile(prev => prev ? { ...prev, ...updates } : null);
        
        toast({
          title: "Profile updated",
          description: "Your profile has been successfully updated.",
        });
      } else {
        toast({
          title: "Update failed",
          description: result.error || "Failed to update profile.",
          variant: "destructive",
        });
      }

      return result;
    } catch (err: any) {
      const errorMessage = err.message || 'Update failed';
      toast({
        title: "Update failed",
        description: errorMessage,
        variant: "destructive",
      });
      return { success: false, error: errorMessage };
    }
  }, [userId, toast]);

  // Refresh data manually
  const refresh = useCallback(() => {
    fetchData(true);
  }, [fetchData]);

  // Initial data fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Optional automatic refetch interval
  useEffect(() => {
    if (!refetchInterval) return;

    const interval = setInterval(() => {
      fetchData();
    }, refetchInterval);

    return () => clearInterval(interval);
  }, [fetchData, refetchInterval]);

  return {
    // Data
    profile,
    proposals: dashboardData.proposals,
    portfolioSize: dashboardData.portfolioSize,
    totalRevenue: dashboardData.totalRevenue,
    co2Offset: dashboardData.co2Offset,
    
    // State
    loading,
    error,
    
    // Actions
    updateProfile,
    refresh,
    
    // Cache control
    clearCache: DataService.clearCache,
    invalidateCache: DataService.invalidateCache
  };
}
