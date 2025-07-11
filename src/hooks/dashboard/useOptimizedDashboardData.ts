import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/auth';
import { fetchDashboardStatsOptimized } from '@/hooks/proposals/utils/optimizedQueryBuilders';
import { supabase } from '@/lib/supabase/client';
import { logger } from '@/lib/logger';
import { queryKeys } from '@/lib/queryKeys';
import { QueryErrorBoundary } from '@/components/common/QueryErrorBoundary';

/**
 * Phase 5 Optimization: Optimized dashboard data hook using database functions
 */
export function useOptimizedDashboardData() {
  const { user, userRole } = useAuth();
  
  return useQuery({
    queryKey: queryKeys.dashboard.stats(user?.id || '', userRole || ''),
    queryFn: async () => {
      if (!user?.id || !userRole) {
        throw new Error('User not authenticated');
      }

      logger.info('Fetching optimized dashboard stats', { 
        userId: user.id, 
        userRole 
      });

      const stats = await fetchDashboardStatsOptimized(supabase, user.id, userRole);
      
      logger.info('Optimized dashboard stats fetched', { 
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
}