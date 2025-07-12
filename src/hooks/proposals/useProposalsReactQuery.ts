import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import { queryKeys } from '@/lib/queryKeys';
import { useAuth } from '@/contexts/auth';
import { useProposalCacheManager } from '@/hooks/query/useProposalCacheManager';
import { EnhancedStatusUpdateService } from '@/services/proposals/enhancedStatusUpdateService';
import { updateProposalStatus } from '@/services/proposals/statusUpdateService';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';

interface UseProposalsReactQueryOptions {
  enabled?: boolean;
  refetchInterval?: number;
  staleTime?: number;
  filters?: Record<string, any>;
}

/**
 * React Query implementation for proposals with enhanced cache management
 */
export function useProposalsReactQuery(options: UseProposalsReactQueryOptions = {}) {
  const { user, userRole } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const {
    enabled = true,
    refetchInterval = false,
    staleTime = 2 * 60 * 1000, // 2 minutes
    filters = {}
  } = options;

  const cacheManager = useProposalCacheManager({
    enableRealtime: true,
    enableOptimisticUpdates: true,
    enableCrossTabSync: true
  });

  const proposalsLogger = useMemo(() => logger.withContext({
    component: 'UseProposalsReactQuery',
    feature: 'proposals-react-query'
  }), []);

  // Proposals list query
  const proposalsQuery = useQuery({
    queryKey: queryKeys.proposals.list(user?.id || '', userRole || '', filters),
    queryFn: async () => {
      if (!user?.id || !userRole) {
        throw new Error('User authentication required');
      }

      proposalsLogger.info('Fetching proposals with React Query', {
        userId: user.id,
        userRole,
        filters
      });

      const { data, error } = await supabase.rpc('search_proposals_optimized', {
        user_id_param: user.id,
        user_role_param: userRole,
        search_term: filters.search || null,
        status_filter: filters.status || 'all',
        limit_param: filters.limit || 50,
        offset_param: filters.offset || 0
      });

      if (error) {
        throw error;
      }

      const proposalData = data || [];

      proposalsLogger.info('Proposals fetched successfully', {
        count: proposalData.length
      });

      return proposalData;
    },
    enabled: enabled && !!user?.id && !!userRole,
    staleTime,
    refetchInterval,
    refetchOnWindowFocus: false,
    retry: (failureCount, error: any) => {
      // Don't retry on authentication errors
      if (error?.message?.includes('authentication') || error?.message?.includes('unauthorized')) {
        return false;
      }
      return failureCount < 2;
    }
  });

  // Status update mutation
  const statusUpdateMutation = useMutation({
    mutationFn: async ({ proposalId, newStatus, previousStatus }: {
      proposalId: string;
      newStatus: string;
      previousStatus?: string;
    }) => {
      if (!user?.id || !userRole) {
        throw new Error('User authentication required');
      }

      proposalsLogger.info('Updating proposal status via mutation', {
        proposalId,
        newStatus,
        previousStatus
      });

      // Apply optimistic update immediately
      cacheManager.optimisticStatusUpdate(proposalId, newStatus, user.id, userRole);

      // Perform the actual update
      const result = await updateProposalStatus(proposalId, newStatus, user.id);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to update status');
      }

      // Trigger enhanced cache invalidation
      await EnhancedStatusUpdateService.updateStatusWithCacheInvalidation(
        proposalId,
        newStatus,
        user.id,
        userRole,
        previousStatus
      );

      return result;
    },
    onSuccess: (_, variables) => {
      proposalsLogger.info('Status update mutation successful', {
        proposalId: variables.proposalId,
        newStatus: variables.newStatus
      });

      toast({
        title: 'Status Updated',
        description: `Proposal status changed to ${variables.newStatus}`,
      });
    },
    onError: (error, variables) => {
      proposalsLogger.error('Status update mutation failed', {
        error: error instanceof Error ? error.message : String(error),
        proposalId: variables.proposalId,
        newStatus: variables.newStatus
      });

      // Revert optimistic update on error
      queryClient.invalidateQueries({
        queryKey: queryKeys.proposals.list(user?.id || '', userRole || '', filters)
      });

      toast({
        title: 'Update Failed',
        description: error instanceof Error ? error.message : 'Failed to update status',
        variant: 'destructive'
      });
    }
  });

  // Prefetch next page for better UX
  const prefetchNextPage = useCallback(async () => {
    if (!user?.id || !userRole) return;

    const nextOffset = (filters.offset || 0) + (filters.limit || 50);
    const nextFilters = { 
      ...filters, 
      offset: nextOffset,
      search: filters.search,
      status: filters.status,
      limit: filters.limit
    };

    await queryClient.prefetchQuery({
      queryKey: queryKeys.proposals.list(user.id, userRole, nextFilters),
      queryFn: async () => {
        const { data, error } = await supabase.rpc('search_proposals_optimized', {
          user_id_param: user.id,
          user_role_param: userRole,
          search_term: filters.search || null,
          status_filter: filters.status || 'all',
          limit_param: filters.limit || 50,
          offset_param: nextOffset
        });

        if (error) {
          throw error;
        }

        return data || [];
      },
      staleTime: staleTime / 2 // Shorter stale time for prefetched data
    });
  }, [user?.id, userRole, filters, queryClient, staleTime]);

  // Manual refetch with cache invalidation
  const refetchProposals = useCallback(async () => {
    proposalsLogger.info('Manual refetch triggered');
    
    // Invalidate related caches first
    await cacheManager.invalidateProposalRelatedData();
    
    // Then refetch
    return proposalsQuery.refetch();
  }, [cacheManager, proposalsQuery.refetch, proposalsLogger]);

  // Batch operations
  const batchUpdateStatuses = useCallback(async (updates: Array<{
    proposalId: string;
    newStatus: string;
    previousStatus?: string;
  }>) => {
    if (!user?.id || !userRole) {
      throw new Error('User authentication required');
    }

    proposalsLogger.info('Starting batch status updates', {
      updateCount: updates.length
    });

    try {
      await EnhancedStatusUpdateService.batchUpdateStatuses(updates, user.id, userRole);
      
      // Refresh data after batch update
      await refetchProposals();

      toast({
        title: 'Batch Update Complete',
        description: `Updated ${updates.length} proposal(s)`,
      });

    } catch (error) {
      proposalsLogger.error('Batch update failed', {
        error: error instanceof Error ? error.message : String(error),
        updateCount: updates.length
      });

      toast({
        title: 'Batch Update Failed',
        description: error instanceof Error ? error.message : 'Failed to update proposals',
        variant: 'destructive'
      });

      throw error;
    }
  }, [user?.id, userRole, refetchProposals, toast, proposalsLogger]);

  // Get cache health information
  const getCacheInfo = useCallback(() => {
    const health = cacheManager.getCacheHealth();
    const currentQuery = queryClient.getQueryState(
      queryKeys.proposals.list(user?.id || '', userRole || '', filters)
    );

    return {
      ...health,
      currentQueryStatus: currentQuery?.status,
      currentQueryUpdatedAt: currentQuery?.dataUpdatedAt,
      lastFetched: currentQuery?.dataUpdatedAt ? new Date(currentQuery.dataUpdatedAt).toISOString() : null
    };
  }, [cacheManager, queryClient, user?.id, userRole, filters]);

  return {
    // Query data
    proposals: proposalsQuery.data || [],
    isLoading: proposalsQuery.isLoading,
    isFetching: proposalsQuery.isFetching,
    error: proposalsQuery.error,
    
    // Mutation states
    isUpdatingStatus: statusUpdateMutation.isPending,
    
    // Actions
    updateStatus: statusUpdateMutation.mutate,
    updateStatusAsync: statusUpdateMutation.mutateAsync,
    batchUpdateStatuses,
    refetchProposals,
    prefetchNextPage,
    
    // Cache management
    invalidateCache: cacheManager.invalidateProposalRelatedData,
    getCacheInfo,
    
    // Raw query for advanced usage
    query: proposalsQuery,
    mutation: statusUpdateMutation
  };
}