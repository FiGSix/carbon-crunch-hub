import { useState, useCallback, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/auth';
import { useToast } from '@/hooks/use-toast';
import { UnifiedDataService } from '@/services/unified/UnifiedDataService';
import { ClientData } from '@/hooks/useMyClients';
import { logger } from '@/lib/logger';
import { createFetchErrorHandler } from '@/lib/errors/fetchErrorHandler';

export interface UseClientsPaginatedResult {
  clients: ClientData[];
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  error: string | null;
  totalCount: number;
  loadMore: () => void;
  refresh: () => void;
}

const PAGE_SIZE = 20;

export function useClientsPaginated(): UseClientsPaginatedResult {
  const [clients, setClients] = useState<ClientData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [offset, setOffset] = useState(0);
  
  const mountedRef = useRef(true);
  const { user, userRole } = useAuth();
  const { toast } = useToast();
  const handleFetchError = createFetchErrorHandler(toast);

  const fetchClients = useCallback(async (currentOffset = 0, isLoadMore = false, forceRefresh = false) => {
    if (!user?.id || !userRole) {
      const errorMessage = 'User not authenticated or role not determined';
      setError(errorMessage);
      setIsLoading(false);
      
      // Show toast for initial fetch authentication errors
      if (currentOffset === 0 && !isLoadMore) {
        handleFetchError(new Error(errorMessage), {
          isInitialFetch: true,
          toastTitle: 'Authentication Required',
          context: 'clients'
        });
      }
      return;
    }

    try {
      if (isLoadMore) {
        setIsLoadingMore(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      const result = await UnifiedDataService.getClients(
        user.id, 
        userRole, 
        forceRefresh,
        PAGE_SIZE,
        currentOffset
      );
      
      if (!mountedRef.current) return;

      // Transform to match expected interface
      const transformedClients: ClientData[] = result.clients.map(client => ({
        client_id: client.id,
        client_name: client.name,
        client_email: client.email,
        company_name: client.company,
        project_count: client.projectCount,
        total_mwp: client.totalKwp / 1000, // Convert kWp to MWp
        created_at: client.createdAt
      }));

      if (isLoadMore) {
        setClients(prev => [...prev, ...transformedClients]);
      } else {
        setClients(transformedClients);
      }
      
      setHasMore(result.hasMore);
      setTotalCount(result.totalCount);
      setOffset(result.nextOffset);

      logger.info('Clients fetched successfully', {
        count: transformedClients.length,
        totalCount: result.totalCount,
        hasMore: result.hasMore
      });

    } catch (err) {
      logger.error('Error fetching clients', { error: err });
      
      if (mountedRef.current) {
        const errorMessage = handleFetchError(err, {
          isInitialFetch: currentOffset === 0 && !isLoadMore,
          isRefresh: forceRefresh && !isLoadMore,
          context: 'clients',
          showToast: true // Always show toast for load more failures and initial/refresh errors
        });
        
        setError(errorMessage);
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    }
  }, [user, userRole, toast, handleFetchError]);

  const loadMore = useCallback(() => {
    if (!isLoadingMore && hasMore) {
      fetchClients(offset, true);
    }
  }, [fetchClients, offset, isLoadingMore, hasMore]);

  const refresh = useCallback(() => {
    setOffset(0);
    fetchClients(0, false, true);
  }, [fetchClients]);

  // Initial fetch - wait for both user and userRole
  useEffect(() => {
    if (user && userRole) {
      fetchClients(0, false, false);
    } else {
      setIsLoading(false);
    }
  }, [user, userRole]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  return {
    clients,
    isLoading,
    isLoadingMore,
    hasMore,
    error,
    totalCount,
    loadMore,
    refresh
  };
}
