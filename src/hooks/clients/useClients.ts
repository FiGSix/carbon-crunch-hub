import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useAuth } from '@/contexts/auth';
import { useToast } from '@/hooks/use-toast';
import { UnifiedDataService } from '@/services/unified/UnifiedDataService';
import { ClientData } from './types';
import { logger } from '@/lib/logger';
import { createFetchErrorHandler } from '@/lib/errors/fetchErrorHandler';
import { devLogger } from '@/lib/performance/ConsoleReplacementUtility';

export interface UseClientsOptions {
  /** Enable pagination. If false, loads all clients at once */
  paginated?: boolean;
  /** Page size for pagination (default: 20) */
  pageSize?: number;
}

export interface UseClientsResult {
  clients: ClientData[];
  isLoading: boolean;
  isLoadingMore: boolean;
  isRefreshing: boolean;
  hasMore: boolean;
  error: string | null;
  totalCount: number;
  loadMore: () => void;
  refresh: () => void;
}

const DEFAULT_PAGE_SIZE = 20;

/**
 * Single source of truth for fetching clients
 * Supports both paginated and non-paginated modes
 * No race conditions, stable dependencies, proper cleanup
 */
export function useClients(options: UseClientsOptions = {}): UseClientsResult {
  const { paginated = true, pageSize = DEFAULT_PAGE_SIZE } = options;
  
  // State
  const [clients, setClients] = useState<ClientData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [offset, setOffset] = useState(0);
  
  // Refs for cleanup and preventing duplicate fetches
  const mountedRef = useRef(true);
  const isFetchingRef = useRef(false);
  
  // Hooks
  const { user, userRole } = useAuth();
  const { toast } = useToast();
  const handleFetchError = useMemo(() => createFetchErrorHandler(toast), [toast]);

  /**
   * Core fetch function - handles all loading scenarios
   */
  const fetchClients = useCallback(async (
    currentOffset = 0, 
    isLoadMore = false, 
    forceRefresh = false
  ) => {
    devLogger.clients.log('📥 fetchClients called', { currentOffset, isLoadMore, forceRefresh });
    
    // Auth check
    if (!user?.id || !userRole) {
      const errorMessage = 'User not authenticated or role not determined';
      setError(errorMessage);
      setIsLoading(false);
      
      if (!isLoadMore) {
        handleFetchError(new Error(errorMessage), {
          isInitialFetch: true,
          toastTitle: 'Authentication Required',
          context: 'clients'
        });
      }
      return;
    }

    // Prevent duplicate fetches
    if (isFetchingRef.current) {
      devLogger.clients.log('⏸️ Fetch already in progress, skipping');
      return;
    }

    try {
      isFetchingRef.current = true;
      
      // Set appropriate loading state
      if (isLoadMore) {
        setIsLoadingMore(true);
      } else if (forceRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      
      setError(null);

      devLogger.clients.log('🚀 Calling UnifiedDataService', { userId: user.id, userRole, pageSize, currentOffset });
      
      // Fetch data
      const result = await UnifiedDataService.getClients(
        user.id, 
        userRole, 
        forceRefresh,
        paginated ? pageSize : 1000, // Load all if not paginated
        currentOffset
      );
      
      if (!mountedRef.current) return;

      devLogger.clients.log('✅ Data received', { count: result.clients.length, totalCount: result.totalCount });

      // Transform data
      const transformedClients: ClientData[] = result.clients.map(client => ({
        client_id: client.id,
        client_name: client.name,
        client_email: client.email,
        company_name: client.company || '',
        project_count: client.projectCount,
        total_mwp: client.totalKwp / 1000,
        created_at: client.createdAt,
        agent_company_name: client.agentCompanyName,
        agent_id: client.agentId,
        is_active: client.isActive
      }));

      // Update state
      if (isLoadMore) {
        setClients(prev => [...prev, ...transformedClients]);
      } else {
        setClients(transformedClients);
      }
      
      setHasMore(paginated ? result.hasMore : false);
      setTotalCount(result.totalCount);
      setOffset(result.nextOffset);

      logger.info('Clients fetched successfully', {
        count: transformedClients.length,
        totalCount: result.totalCount,
        hasMore: result.hasMore
      });

    } catch (err) {
      devLogger.clients.error('❌ Fetch error', err);
      logger.error('Error fetching clients', { error: err });
      
      if (mountedRef.current) {
        const errorMessage = handleFetchError(err, {
          isInitialFetch: currentOffset === 0 && !isLoadMore,
          isRefresh: forceRefresh,
          context: 'clients',
          showToast: true
        });
        
        setError(errorMessage);
      }
    } finally {
      devLogger.clients.log('🏁 Fetch complete');
      
      if (mountedRef.current) {
        setIsLoading(false);
        setIsLoadingMore(false);
        setIsRefreshing(false);
      }
      
      isFetchingRef.current = false;
    }
  }, [user?.id, userRole, paginated, pageSize, handleFetchError]);

  /**
   * Load next page of clients
   */
  const loadMore = useCallback(() => {
    if (!isLoadingMore && hasMore) {
      devLogger.clients.log('🔽 Loading more clients', { offset });
      fetchClients(offset, true, false);
    }
  }, [fetchClients, offset, isLoadingMore, hasMore]);

  /**
   * Refresh from beginning
   */
  const refresh = useCallback(() => {
    devLogger.clients.log('🔄 Refreshing clients');
    setOffset(0);
    fetchClients(0, false, true);
  }, [fetchClients]);

  // Initial fetch when auth is ready
  useEffect(() => {
    if (user?.id && userRole) {
      devLogger.clients.log('🎬 Initial fetch triggered');
      fetchClients(0, false, false);
    } else {
      setIsLoading(false);
    }
  }, [user?.id, userRole, fetchClients]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      devLogger.clients.log('🧹 Cleaning up useClients');
      mountedRef.current = false;
    };
  }, []);

  return {
    clients,
    isLoading,
    isLoadingMore,
    isRefreshing,
    hasMore,
    error,
    totalCount,
    loadMore,
    refresh
  };
}
