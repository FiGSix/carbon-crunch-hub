import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/auth';
import { fetchDashboardStatsOptimized } from '@/hooks/proposals/utils/optimizedQueryBuilders';
import { supabase } from '@/lib/supabase/client';
import { logger } from '@/lib/logger';
import { queryKeys } from '@/lib/queryKeys';

/**
 * Phase 5 Optimization: Optimized dashboard stats with complete metrics
 */
export interface OptimizedDashboardMetrics {
  totalProposals: number;
  activeProposals: number;
  signedProposals: number;
  totalCarbonCredits: number;
  totalRevenue: number;
  portfolioSizeKwp: number;
  portfolioSizeMwp: number;
  isLoading: boolean;
  error: string | null;
}

export function useOptimizedDashboardStats(): OptimizedDashboardMetrics {
  const { user, userRole } = useAuth();
  
  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.dashboard.stats(user?.id || '', userRole || ''),
    queryFn: async () => {
      if (!user?.id || !userRole) {
        throw new Error('User not authenticated');
      }

      logger.info('Fetching optimized dashboard stats v2', { 
        userId: user.id, 
        userRole 
      });

      const stats = await fetchDashboardStatsOptimized(supabase, user.id, userRole);
      
      logger.info('Optimized dashboard stats v2 fetched', { 
        stats,
        userId: user.id 
      });

      return {
        totalProposals: Number(stats.total_proposals),
        activeProposals: Number(stats.active_proposals),
        signedProposals: Number(stats.signed_proposals),
        totalCarbonCredits: Number(stats.total_carbon_credits),
        totalRevenue: Number(stats.total_revenue),
        portfolioSizeKwp: Number(stats.portfolio_size_kwp),
        portfolioSizeMwp: Number(stats.portfolio_size_kwp) / 1000
      };
    },
    enabled: !!user?.id && !!userRole,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000 // 5 minutes
  });

  return {
    totalProposals: data?.totalProposals || 0,
    activeProposals: data?.activeProposals || 0,
    signedProposals: data?.signedProposals || 0,
    totalCarbonCredits: data?.totalCarbonCredits || 0,
    totalRevenue: data?.totalRevenue || 0,
    portfolioSizeKwp: data?.portfolioSizeKwp || 0,
    portfolioSizeMwp: data?.portfolioSizeMwp || 0,
    isLoading,
    error: error?.message || null
  };
}