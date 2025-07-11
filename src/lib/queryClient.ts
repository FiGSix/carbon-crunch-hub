import { QueryClient, DefaultOptions } from '@tanstack/react-query';
import { logger } from '@/lib/logger';

/**
 * Optimized React Query configuration
 * 
 * This configuration provides:
 * - Smart retry logic based on error types
 * - Optimized cache settings for performance
 * - Proper error handling and logging
 * - Background refetch optimization
 */

const queryConfig: DefaultOptions = {
  queries: {
    // Cache configuration
    staleTime: 5 * 60 * 1000, // 5 minutes - data is considered fresh
    gcTime: 10 * 60 * 1000, // 10 minutes - how long to keep in cache after unused
    
    // Retry configuration
    retry: (failureCount, error: any) => {
      // Don't retry on authentication errors (401, 403)
      if (error?.status === 401 || error?.status === 403) {
        return false;
      }
      
      // Don't retry on client errors (4xx except auth)
      if (error?.status >= 400 && error?.status < 500) {
        return false;
      }
      
      // Don't retry on network timeouts after 2 attempts
      if (error?.code === 'NETWORK_ERROR' && failureCount >= 2) {
        return false;
      }
      
      // Retry up to 3 times for server errors and network issues
      return failureCount < 3;
    },
    
    // Refetch configuration
    refetchOnWindowFocus: false, // Disabled to reduce unnecessary requests
    refetchOnMount: true, // Always refetch on component mount
    refetchOnReconnect: true, // Refetch when network reconnects
  },
  
  mutations: {
    // Retry mutations only once
    retry: 1,
  },
};

/**
 * Create and configure the global query client
 */
export const createQueryClient = () => {
  const client = new QueryClient({
    defaultOptions: queryConfig,
  });

  return client;
};

/**
 * Utility functions for cache management
 */
export const cacheUtils = {
  /**
   * Invalidate multiple query patterns efficiently
   */
  invalidateQueries: async (client: QueryClient, queryKeys: readonly unknown[][]) => {
    await Promise.all(
      queryKeys.map(queryKey => 
        client.invalidateQueries({ queryKey: queryKey as any })
      )
    );
  },

  /**
   * Prefetch data for better UX
   */
  prefetchQuery: async (
    client: QueryClient, 
    queryKey: readonly unknown[], 
    queryFn: () => Promise<any>,
    options?: { staleTime?: number }
  ) => {
    await client.prefetchQuery({
      queryKey,
      queryFn,
      staleTime: options?.staleTime || 2 * 60 * 1000, // 2 minutes default
    });
  },

  /**
   * Remove specific queries from cache
   */
  removeQueries: (client: QueryClient, queryKeys: readonly unknown[][]) => {
    queryKeys.forEach(queryKey => {
      client.removeQueries({ queryKey });
    });
  },

  /**
   * Clear all cache data (use sparingly)
   */
  clearCache: (client: QueryClient) => {
    client.clear();
    logger.withContext({ 
      component: 'ReactQuery',
      feature: 'cache-clear' 
    }).info('Query cache cleared');
  },
};