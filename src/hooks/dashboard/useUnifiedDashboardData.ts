import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/auth';
import { supabase } from '@/lib/supabase/client';
import { logger } from '@/lib/logger';
import { UnifiedDashboardCalculations } from '@/services/dashboard/UnifiedDashboardCalculations';
import { ProposalListItem } from '@/types/proposals';

/**
 * Unified dashboard data hook - single source of truth for all dashboard data
 * Replaces multiple scattered hooks with one optimized query
 */
export function useUnifiedDashboardData() {
  const { user, userRole } = useAuth();
  
  return useQuery({
    queryKey: ['unified-dashboard-data', user?.id, userRole],
    queryFn: async () => {
      if (!user?.id || !userRole) {
        throw new Error('User not authenticated');
      }

      logger.info('Fetching unified dashboard data', { 
        userId: user.id, 
        userRole 
      });

      // Single optimized query for all dashboard data
      const { data: statsData, error: statsError } = await supabase.rpc('get_dashboard_stats_optimized', {
        user_id_param: user.id,
        user_role_param: userRole
      });

      if (statsError) {
        logger.error('Failed to fetch dashboard stats', { error: statsError });
        throw statsError;
      }

      // Fetch proposals with minimal data for dashboard display
      const { data: proposalsData, error: proposalsError } = await supabase.rpc('search_proposals_optimized', {
        user_id_param: user.id,
        user_role_param: userRole,
        search_term: null,
        status_filter: 'all',
        limit_param: 10, // Only fetch recent proposals for dashboard
        offset_param: 0
      });

      if (proposalsError) {
        logger.error('Failed to fetch proposals', { error: proposalsError });
        throw proposalsError;
      }

      // Transform proposals data to match ProposalListItem interface
      const proposals: ProposalListItem[] = (proposalsData || []).map(p => ({
        id: p.id,
        title: p.title,
        status: p.status as any,
        created_at: p.created_at,
        agent_id: p.agent_id,
        client_id: p.client_id,
        client_reference_id: p.client_reference_id,
        carbon_credits: p.carbon_credits,
        system_size_kwp: p.system_size_kwp,
        invitation_sent_at: p.invitation_sent_at,
        invitation_viewed_at: p.invitation_viewed_at,
        // Add required ProposalListItem fields
        name: p.title,
        client: 'Client', // Simplified for dashboard display
        date: p.created_at,
        size: p.system_size_kwp || 0,
        revenue: p.carbon_credits || 0
      }));

      // Use unified calculations for consistent metrics
      const computedMetrics = UnifiedDashboardCalculations.calculateAllMetrics(proposals, userRole);

      const result = {
        // Raw data
        proposals,
        
        // Database-optimized stats (statsData is array, take first element)
        totalProposals: Number(statsData[0]?.total_proposals || 0),
        activeProposals: Number(statsData[0]?.active_proposals || 0), 
        signedProposals: Number(statsData[0]?.signed_proposals || 0),
        totalCarbonCredits: Number(statsData[0]?.total_carbon_credits || 0),
        totalRevenue: Number(statsData[0]?.total_revenue || 0),
        portfolioSizeKwp: Number(statsData[0]?.portfolio_size_kwp || 0),
        
        // Computed metrics for display
        portfolioSize: computedMetrics.portfolioSize,
        potentialRevenue: computedMetrics.totalRevenue,
        co2Offset: computedMetrics.co2Offset,
        
        // Loading states
        loading: false,
        error: null
      };

      logger.info('Unified dashboard data loaded', { 
        proposalsCount: proposals.length,
        totalRevenue: result.totalRevenue,
        portfolioSize: result.portfolioSize
      });

      return result;
    },
    enabled: !!user?.id && !!userRole,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    retry: 2
  });
}