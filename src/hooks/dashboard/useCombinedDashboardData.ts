import { useQueries } from '@tanstack/react-query';
import { useAuth } from '@/contexts/auth';
import { supabase } from '@/lib/supabase/client';
import { queryKeys } from '@/lib/queryKeys';
import { logger } from '@/lib/logger';
import { DashboardMetricsByStage } from './types';
import { ProposalListItem } from '@/types/proposals';

/**
 * Phase 2 Optimization: Combined dashboard data fetching
 * Parallelizes metrics and proposals queries for faster dashboard load
 */
export function useCombinedDashboardData() {
  const { user, userRole } = useAuth();

  const results = useQueries({
    queries: [
      // Query 1: Dashboard metrics by stage
      {
        queryKey: queryKeys.dashboard.metricsByStage(user?.id || '', userRole || ''),
        queryFn: async () => {
          if (!user?.id || !userRole) {
            throw new Error('User not authenticated');
          }

          logger.info('Fetching dashboard metrics by stage', { userId: user.id, userRole });

          const { data, error } = await supabase.rpc('get_dashboard_metrics_by_stage', {
            user_id_param: user.id,
            user_role_param: userRole
          });

          if (error) {
            logger.error('Error fetching dashboard metrics by stage', { error });
            throw error;
          }

          // data is an array, take the first element
          const result = (Array.isArray(data) && data.length > 0 ? data[0] : data) as any;

          const metrics: DashboardMetricsByStage = {
            auditReadyMwp: Number(result?.audit_ready_mwp || 0),
            auditReadyRevenue: Number(result?.audit_ready_revenue || 0),
            onboardingMwp: Number(result?.onboarding_mwp || 0),
            pendingApprovalMwp: Number(result?.pending_approval_mwp || 0)
          };

          logger.info('Dashboard metrics by stage fetched', { metrics });
          return metrics;
        },
        enabled: !!user?.id && !!userRole,
        staleTime: 3 * 60 * 1000, // 3 minutes
        gcTime: 10 * 60 * 1000, // 10 minutes
        refetchOnWindowFocus: false,
        retry: (failureCount, error: any) => {
          if (error?.message?.includes('not authenticated')) return false;
          return failureCount < 2;
        }
      },
      // Query 2: Recent proposals
      {
        queryKey: queryKeys.proposals.list(user?.id || '', userRole || '', {}),
        queryFn: async () => {
          if (!user?.id || !userRole) {
            throw new Error('User not authenticated');
          }

          logger.info('Fetching recent proposals', { userId: user.id, userRole });

          const { data, error } = await supabase.rpc('search_proposals_optimized', {
            user_id_param: user.id,
            user_role_param: userRole,
            limit_param: 10,
            offset_param: 0
          });

          if (error) {
            logger.error('Error fetching recent proposals', { error });
            throw error;
          }

          const proposals: ProposalListItem[] = (data || []).map((item: any) => ({
            id: item.id,
            title: item.title || 'Untitled',
            name: item.title || 'Untitled',
            client: item.client_name || 'Unknown',
            date: item.created_at,
            created_at: item.created_at,
            size: Number(item.system_size_kwp || 0),
            status: item.status || 'draft',
            revenue: Number(item.expected_revenue_year_1 || 0),
            agent: item.agent_name,
            agent_id: item.agent_id,
            isMultiPhase: false
          }));

          logger.info('Recent proposals fetched', { count: proposals.length });
          return proposals;
        },
        enabled: !!user?.id && !!userRole,
        staleTime: 3 * 60 * 1000, // 3 minutes
        gcTime: 10 * 60 * 1000, // 10 minutes
        refetchOnWindowFocus: false,
        retry: (failureCount, error: any) => {
          if (error?.message?.includes('not authenticated')) return false;
          return failureCount < 2;
        }
      }
    ]
  });

  return {
    metrics: results[0].data,
    proposals: results[1].data,
    isLoading: results.some(r => r.isLoading),
    isError: results.some(r => r.isError),
    errors: results.map(r => r.error).filter(Boolean),
    refetch: () => {
      results[0].refetch();
      results[1].refetch();
    }
  };
}
