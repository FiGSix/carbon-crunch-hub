import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/auth';
import { supabase } from '@/lib/supabase/client';
import { logger } from '@/lib/logger';
import { queryKeys } from '@/lib/queryKeys';
import { DashboardMetricsByStage } from './types';

/**
 * Phase 3: React Query hook for fetching dashboard metrics by stage
 * 
 * This hook fetches the 4 key dashboard metrics using the optimized
 * database function `get_dashboard_metrics_by_stage`:
 * 
 * 1. Audit Ready MWp - Projects that are audit ready
 * 2. Audit Ready Revenue - Total revenue for 2025-2030 (Rands)
 * 3. Onboarding MWp - Projects with signed cessions but not audit ready
 * 4. Pending Approval MWp - Proposals awaiting client approval
 * 
 * Features:
 * - Role-based filtering (admin/agent/client)
 * - Automatic caching with React Query
 * - Error handling and logging
 * - Type-safe data transformation
 * 
 * @returns React Query result with dashboard metrics
 */
export function useDashboardMetricsByStage() {
  const { user, userRole } = useAuth();
  
  return useQuery({
    queryKey: queryKeys.dashboard.metricsByStage(user?.id || '', userRole || ''),
    queryFn: async (): Promise<DashboardMetricsByStage> => {
      if (!user?.id || !userRole) {
        throw new Error('User not authenticated');
      }

      const metricsLogger = logger.withContext({ 
        component: 'useDashboardMetricsByStage', 
        feature: 'dashboard-metrics',
        userId: user.id,
        userRole
      });

      metricsLogger.info('Fetching dashboard metrics by stage', { 
        userId: user.id, 
        userRole 
      });

      try {
        // Call the optimized database function
        const { data, error } = await supabase.rpc('get_dashboard_metrics_by_stage', {
          user_id_param: user.id,
          user_role_param: userRole
        });

        if (error) {
          metricsLogger.error('Failed to fetch dashboard metrics', { 
            error: error.message,
            code: error.code,
            details: error.details
          });
          throw error;
        }

        // The function returns a single row, extract it
        const metrics = data?.[0] || {
          audit_ready_mwp: 0,
          audit_ready_revenue: 0,
          onboarding_mwp: 0,
          pending_approval_mwp: 0
        };

        // Transform database response to TypeScript interface
        const result: DashboardMetricsByStage = {
          auditReadyMwp: Number(metrics.audit_ready_mwp || 0),
          auditReadyRevenue: Math.round(Number(metrics.audit_ready_revenue || 0)),
          onboardingMwp: Number(metrics.onboarding_mwp || 0),
          pendingApprovalMwp: Number(metrics.pending_approval_mwp || 0)
        };

        metricsLogger.info('Dashboard metrics loaded successfully', { 
          metrics: result,
          auditReadyCount: result.auditReadyMwp > 0 ? 'present' : 'empty',
          revenueCalculated: result.auditReadyRevenue > 0
        });

        return result;
      } catch (error) {
        metricsLogger.error('Unexpected error fetching dashboard metrics', { 
          error: error instanceof Error ? error.message : String(error)
        });
        throw error;
      }
    },
    // Only enable query if user is authenticated
    enabled: !!user?.id && !!userRole,
    // Cache for 2 minutes (metrics don't change frequently)
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes (formerly cacheTime)
    // Don't refetch on window focus to reduce unnecessary API calls
    refetchOnWindowFocus: false,
    // Retry failed requests up to 2 times
    retry: 2,
    // Exponential backoff for retries
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}

/**
 * Type guard to check if metrics data is valid
 */
export function isValidMetrics(metrics: any): metrics is DashboardMetricsByStage {
  return (
    metrics &&
    typeof metrics === 'object' &&
    typeof metrics.auditReadyMwp === 'number' &&
    typeof metrics.auditReadyRevenue === 'number' &&
    typeof metrics.onboardingMwp === 'number' &&
    typeof metrics.pendingApprovalMwp === 'number'
  );
}

/**
 * Helper to get empty metrics object
 * Useful for fallback scenarios
 */
export function getEmptyMetrics(): DashboardMetricsByStage {
  return {
    auditReadyMwp: 0,
    auditReadyRevenue: 0,
    onboardingMwp: 0,
    pendingApprovalMwp: 0
  };
}
