import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';
import { queryKeys } from '@/lib/queryKeys';
import { useCacheInvalidation } from './useCacheInvalidation';
import { logger } from '@/lib/logger';

interface ProposalCacheOptions {
  enableRealtime?: boolean;
  enableOptimisticUpdates?: boolean;
  enableCrossTabSync?: boolean;
}

/**
 * Advanced proposal cache management hook
 * Handles automatic invalidation on status changes, real-time updates, and cross-tab synchronization
 */
export function useProposalCacheManager(options: ProposalCacheOptions = {}) {
  const queryClient = useQueryClient();
  const { invalidateProposals, invalidateDashboard, batchInvalidate, optimisticUpdate } = useCacheInvalidation();
  
  const {
    enableRealtime = true,
    enableOptimisticUpdates = true,
    enableCrossTabSync = true
  } = options;

  const cacheLogger = logger.withContext({
    component: 'ProposalCacheManager',
    feature: 'proposal-cache-invalidation'
  });

  /**
   * Invalidate proposal-related caches when status changes
   */
  const invalidateProposalRelatedData = useCallback(async (proposalId?: string, newStatus?: string) => {
    cacheLogger.info('Starting proposal cache invalidation', {
      proposalId,
      newStatus,
      reason: 'status-change'
    });

    try {
      await batchInvalidate([
        // Invalidate proposal queries
        invalidateProposals,
        // Invalidate dashboard stats as they depend on proposal statuses
        invalidateDashboard,
        // Invalidate specific proposal if known
        ...(proposalId ? [async () => {
          await queryClient.invalidateQueries({
            queryKey: queryKeys.proposals.detail(proposalId)
          });
        }] : [])
      ]);

      cacheLogger.info('Proposal cache invalidation completed', {
        proposalId,
        newStatus
      });

      // Broadcast to other tabs if enabled
      if (enableCrossTabSync) {
        broadcastCacheInvalidation(proposalId, newStatus);
      }

    } catch (error) {
      cacheLogger.error('Failed to invalidate proposal cache', {
        error: error instanceof Error ? error.message : String(error),
        proposalId,
        newStatus
      });
    }
  }, [batchInvalidate, invalidateProposals, invalidateDashboard, queryClient, cacheLogger, enableCrossTabSync]);

  /**
   * Optimistic update for immediate UI feedback
   */
  const optimisticStatusUpdate = useCallback((
    proposalId: string,
    newStatus: string,
    userId: string,
    userRole: string
  ) => {
    if (!enableOptimisticUpdates) return;

    cacheLogger.info('Applying optimistic status update', {
      proposalId,
      newStatus
    });

    // Update proposals list cache optimistically
    const proposalListKey = queryKeys.proposals.list(userId, userRole);
    optimisticUpdate(proposalListKey, (oldData: any[]) => {
      if (!oldData) return oldData;
      
      return oldData.map(proposal => 
        proposal.id === proposalId 
          ? { ...proposal, status: newStatus }
          : proposal
      );
    });

    // Update individual proposal cache optimistically
    const proposalDetailKey = queryKeys.proposals.detail(proposalId);
    optimisticUpdate(proposalDetailKey, (oldData: any) => {
      if (!oldData) return oldData;
      return { ...oldData, status: newStatus };
    });

    // Update dashboard stats optimistically (increment/decrement counts)
    const dashboardKey = queryKeys.dashboard.stats(userId, userRole);
    optimisticUpdate(dashboardKey, (oldStats: any) => {
      if (!oldStats) return oldStats;
      
      // This is a simplified update - you'd need actual previous status to be accurate
      // For now, we'll just mark it as needing refresh
      return { ...oldStats, _needsRefresh: true };
    });

  }, [enableOptimisticUpdates, optimisticUpdate, cacheLogger]);

  const [isInvalidating, setIsInvalidating] = useState(false);
  const invalidationTimeoutRef = useRef<NodeJS.Timeout>();

  /**
   * Handle proposal status change events with debounce and deduplication
   */
  const handleStatusChange = useCallback(async (event: Event) => {
    const customEvent = event as CustomEvent;
    const { proposalId, newStatus, previousStatus, userId, userRole } = customEvent.detail || {};

    cacheLogger.info('Handling proposal status change event', {
      proposalId,
      newStatus,
      previousStatus
    });

    // Debounce rapid status changes
    clearTimeout(invalidationTimeoutRef.current);
    
    invalidationTimeoutRef.current = setTimeout(() => {
      if (!isInvalidating) {
        setIsInvalidating(true);
        
        // Apply optimistic update immediately
        if (proposalId && newStatus && userId && userRole && enableOptimisticUpdates) {
          optimisticStatusUpdate(proposalId, newStatus, userId, userRole);
        }

        // Invalidate cache
        invalidateProposalRelatedData(proposalId, newStatus).finally(() => {
          setIsInvalidating(false);
        });
      }
    }, 300); // Debounce for 300ms

  }, [invalidateProposalRelatedData, optimisticStatusUpdate, cacheLogger, isInvalidating, enableOptimisticUpdates]);

  /**
   * Cross-tab synchronization
   */
  const broadcastCacheInvalidation = useCallback((proposalId?: string, newStatus?: string) => {
    if (!enableCrossTabSync) return;

    const message = {
      type: 'PROPOSAL_CACHE_INVALIDATION',
      timestamp: Date.now(),
      data: { proposalId, newStatus }
    };

    localStorage.setItem('cache_invalidation_event', JSON.stringify(message));
    
    // Clean up the event after a short delay
    setTimeout(() => {
      localStorage.removeItem('cache_invalidation_event');
    }, 1000);

    cacheLogger.debug('Cache invalidation broadcasted to other tabs', message);
  }, [enableCrossTabSync, cacheLogger]);

  /**
   * Listen for cross-tab invalidation events
   */
  const handleStorageChange = useCallback((event: StorageEvent) => {
    if (event.key === 'cache_invalidation_event' && event.newValue) {
      try {
        const message = JSON.parse(event.newValue);
        if (message.type === 'PROPOSAL_CACHE_INVALIDATION') {
          cacheLogger.info('Received cache invalidation from another tab', message);
          invalidateProposalRelatedData(message.data.proposalId, message.data.newStatus);
        }
      } catch (error) {
        cacheLogger.error('Failed to parse cross-tab invalidation message', { error });
      }
    }
  }, [invalidateProposalRelatedData, cacheLogger]);

  /**
   * Smart cache invalidation based on proposal changes
   */
  const handleProposalChange = useCallback((changeType: 'create' | 'update' | 'delete', proposalData: any) => {
    cacheLogger.info('Handling proposal change', { changeType, proposalId: proposalData?.id });

    switch (changeType) {
      case 'create':
        // For new proposals, invalidate lists and dashboard
        batchInvalidate([invalidateProposals, invalidateDashboard]);
        break;
      
      case 'update':
        // For updates, we might only need to update specific caches
        invalidateProposalRelatedData(proposalData?.id, proposalData?.status);
        break;
      
      case 'delete':
        // For deletions, remove from cache and invalidate lists
        if (proposalData?.id) {
          queryClient.removeQueries({
            queryKey: queryKeys.proposals.detail(proposalData.id)
          });
        }
        batchInvalidate([invalidateProposals, invalidateDashboard]);
        break;
    }
  }, [batchInvalidate, invalidateProposals, invalidateDashboard, invalidateProposalRelatedData, queryClient, cacheLogger]);

  // Set up event listeners
  useEffect(() => {
    if (enableRealtime) {
      // Listen for proposal status changes
      window.addEventListener('proposal-status-changed', handleStatusChange);
      
      // Listen for general proposal changes
      window.addEventListener('proposal-data-changed', (event: Event) => {
        const customEvent = event as CustomEvent;
        const { changeType, data } = customEvent.detail || {};
        handleProposalChange(changeType, data);
      });
    }

    if (enableCrossTabSync) {
      // Listen for storage changes (cross-tab communication)
      window.addEventListener('storage', handleStorageChange);
    }

    return () => {
      if (enableRealtime) {
        window.removeEventListener('proposal-status-changed', handleStatusChange);
        window.removeEventListener('proposal-data-changed', handleProposalChange as any);
      }
      
      if (enableCrossTabSync) {
        window.removeEventListener('storage', handleStorageChange);
      }
    };
  }, [enableRealtime, enableCrossTabSync, handleStatusChange, handleProposalChange, handleStorageChange]);

  /**
   * Manual invalidation methods for external use
   */
  const manualInvalidation = {
    proposals: invalidateProposals,
    dashboard: invalidateDashboard,
    specific: invalidateProposalRelatedData,
    all: () => batchInvalidate([invalidateProposals, invalidateDashboard])
  };

  /**
   * Cache health check
   */
  const getCacheHealth = useCallback(() => {
    const cache = queryClient.getQueryCache();
    const proposalQueries = cache.findAll({ queryKey: queryKeys.proposals.all });
    const dashboardQueries = cache.findAll({ queryKey: queryKeys.dashboard.all });

    return {
      proposalQueriesCount: proposalQueries.length,
      dashboardQueriesCount: dashboardQueries.length,
      totalQueries: cache.getAll().length,
      staleQueries: cache.getAll().filter(query => query.isStale()).length
    };
  }, [queryClient]);

  return {
    invalidateProposalRelatedData,
    optimisticStatusUpdate,
    handleProposalChange,
    manualInvalidation,
    getCacheHealth,
    cacheLogger
  };
}