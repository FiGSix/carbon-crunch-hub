import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo, useRef } from 'react';
import { queryKeys, queryKeyUtils } from '@/lib/queryKeys';
import { cacheUtils } from '@/lib/queryClient';
import { useAuth } from '@/contexts/auth';
import { logger } from '@/lib/logger';

/**
 * Centralized cache invalidation hook
 * 
 * Provides consistent and efficient cache invalidation patterns
 * across the application
 */
export function useCacheInvalidation() {
  const queryClient = useQueryClient();
  const { user, userRole } = useAuth();
  const debounceTimers = useRef<Map<string, NodeJS.Timeout>>(new Map());
  
  const invalidationLogger = useMemo(() => logger.withContext({ 
    component: 'CacheInvalidation',
    feature: 'cache-management' 
  }), []);

  /**
   * Invalidate dashboard related data
   */
  const invalidateDashboard = useCallback(async () => {
    if (!user?.id || !userRole) return;
    
    const keys = queryKeyUtils.getDashboardKeys(user.id, userRole);
    await cacheUtils.invalidateQueries(queryClient, keys as any);
    
    invalidationLogger.info('Dashboard cache invalidated', { 
      userId: user.id, 
      userRole,
      keyCount: keys.length 
    });
  }, [queryClient, user?.id, userRole, invalidationLogger]);

  /**
   * Invalidate proposal related data
   */
  const invalidateProposals = useCallback(async () => {
    if (!user?.id || !userRole) return;
    
    const keys = queryKeyUtils.getProposalKeys(user.id, userRole);
    await cacheUtils.invalidateQueries(queryClient, keys as any);
    
    invalidationLogger.info('Proposals cache invalidated', { 
      userId: user.id, 
      userRole,
      keyCount: keys.length 
    });
  }, [queryClient, user?.id, userRole, invalidationLogger]);

  /**
   * Invalidate client related data
   */
  const invalidateClients = useCallback(async () => {
    if (!user?.id || !userRole) return;
    
    const keys = queryKeyUtils.getClientKeys(user.id, userRole);
    await cacheUtils.invalidateQueries(queryClient, keys as any);
    
    invalidationLogger.info('Clients cache invalidated', { 
      userId: user.id, 
      userRole,
      keyCount: keys.length 
    });
  }, [queryClient, user?.id, userRole, invalidationLogger]);

  /**
   * Invalidate agent management data - DEBOUNCED
   */
  const invalidateAgentManagement = useCallback(async () => {
    const debounceKey = 'agent-management';
    
    // Clear existing timer
    if (debounceTimers.current.has(debounceKey)) {
      clearTimeout(debounceTimers.current.get(debounceKey)!);
    }
    
    // Set new timer
    const timer = setTimeout(async () => {
      const keys = queryKeyUtils.getAgentManagementKeys();
      await cacheUtils.invalidateQueries(queryClient, keys as any);
      
      invalidationLogger.info('Agent management cache invalidated', { 
        keyCount: keys.length 
      });
      debounceTimers.current.delete(debounceKey);
    }, 1000);
    
    debounceTimers.current.set(debounceKey, timer);
  }, [queryClient, invalidationLogger]);

  /**
   * Invalidate all user-specific data (useful for logout/login)
   */
  const invalidateUserData = useCallback(async () => {
    if (!user?.id || !userRole) return;
    
    const allKeys = [
      ...queryKeyUtils.getDashboardKeys(user.id, userRole),
      ...queryKeyUtils.getProposalKeys(user.id, userRole),
      ...queryKeyUtils.getClientKeys(user.id, userRole),
    ];
    
    await cacheUtils.invalidateQueries(queryClient, allKeys as any);
    
    invalidationLogger.info('All user data cache invalidated', { 
      userId: user.id, 
      userRole,
      keyCount: allKeys.length 
    });
  }, [queryClient, user?.id, userRole, invalidationLogger]);

  /**
   * Invalidate specific query by key
   */
  const invalidateQuery = useCallback(async (queryKey: readonly unknown[]) => {
    await queryClient.invalidateQueries({ queryKey });
    
    invalidationLogger.debug('Specific query invalidated', { queryKey });
  }, [queryClient, invalidationLogger]);

  /**
   * Clear all cache (nuclear option)
   */
  const clearAllCache = useCallback(() => {
    cacheUtils.clearCache(queryClient);
    
    invalidationLogger.warn('All cache cleared');
  }, [queryClient, invalidationLogger]);

  /**
   * Optimistic update helper
   */
  const optimisticUpdate = useCallback(
    <T>(queryKey: readonly unknown[], updater: (old: T | undefined) => T) => {
      queryClient.setQueryData(queryKey, updater);
      
      invalidationLogger.debug('Optimistic update applied', { queryKey });
    },
    [queryClient, invalidationLogger]
  );

  /**
   * Batch invalidation for multiple related changes
   */
  const batchInvalidate = useCallback(
    async (operations: (() => Promise<void>)[]) => {
      await Promise.all(operations.map(op => op()));
      
      invalidationLogger.info('Batch invalidation completed', { 
        operationCount: operations.length 
      });
    },
    [invalidationLogger]
  );

  return {
    // Specific invalidations
    invalidateDashboard,
    invalidateProposals,
    invalidateClients,
    invalidateAgentManagement,
    invalidateUserData,
    
    // Generic operations
    invalidateQuery,
    clearAllCache,
    optimisticUpdate,
    batchInvalidate,
    
    // Query keys for direct access
    queryKeys,
  };
}