import { useProposalCacheManager } from '@/hooks/query/useProposalCacheManager';
import { logger } from '@/lib/logger';

interface ProposalEventData {
  proposalId: string;
  newStatus?: string;
  previousStatus?: string;
  userId?: string;
  userRole?: string;
  changeType?: 'create' | 'update' | 'delete';
  timestamp?: number;
}

/**
 * Enhanced proposal status update service with automatic cache invalidation
 */
export class EnhancedStatusUpdateService {
  private static logger = logger.withContext({
    component: 'EnhancedStatusUpdateService',
    feature: 'proposal-status-cache'
  });

  /**
   * Trigger proposal status change event with proper cache invalidation
   */
  static triggerStatusChangeEvent(data: ProposalEventData): void {
    const eventData = {
      ...data,
      timestamp: Date.now()
    };

    this.logger.info('Triggering proposal status change event', eventData);

    // Dispatch the main status change event
    window.dispatchEvent(new CustomEvent('proposal-status-changed', {
      detail: eventData
    }));

    // Also dispatch a general data change event for broader invalidation
    window.dispatchEvent(new CustomEvent('proposal-data-changed', {
      detail: {
        changeType: data.changeType || 'update',
        data: eventData
      }
    }));

    // Analytics tracking
    this.trackStatusChange(eventData);
  }

  /**
   * Enhanced status update with cache management
   */
  static async updateStatusWithCacheInvalidation(
    proposalId: string,
    newStatus: string,
    userId: string,
    userRole: string,
    previousStatus?: string
  ): Promise<void> {
    this.logger.info('Starting enhanced status update', {
      proposalId,
      newStatus,
      previousStatus,
      userId
    });

    try {
      // First, trigger optimistic update for immediate UI feedback
      this.triggerStatusChangeEvent({
        proposalId,
        newStatus,
        previousStatus,
        userId,
        userRole,
        changeType: 'update'
      });

      this.logger.info('Enhanced status update completed', {
        proposalId,
        newStatus
      });

    } catch (error) {
      this.logger.error('Enhanced status update failed', {
        error: error instanceof Error ? error.message : String(error),
        proposalId,
        newStatus
      });
      throw error;
    }
  }

  /**
   * Batch status updates with coordinated cache invalidation
   */
  static async batchUpdateStatuses(
    updates: Array<{
      proposalId: string;
      newStatus: string;
      previousStatus?: string;
    }>,
    userId: string,
    userRole: string
  ): Promise<void> {
    this.logger.info('Starting batch status updates', {
      updateCount: updates.length,
      userId
    });

    try {
      // Trigger all events at once for better performance
      updates.forEach(update => {
        this.triggerStatusChangeEvent({
          ...update,
          userId,
          userRole,
          changeType: 'update'
        });
      });

      // Single batch invalidation event
      window.dispatchEvent(new CustomEvent('proposal-batch-update', {
        detail: {
          updates,
          userId,
          userRole,
          timestamp: Date.now()
        }
      }));

      this.logger.info('Batch status updates completed', {
        updateCount: updates.length
      });

    } catch (error) {
      this.logger.error('Batch status updates failed', {
        error: error instanceof Error ? error.message : String(error),
        updateCount: updates.length
      });
      throw error;
    }
  }

  /**
   * Handle proposal creation with cache invalidation
   */
  static triggerProposalCreated(proposalData: any, userId: string, userRole: string): void {
    this.logger.info('Triggering proposal created event', {
      proposalId: proposalData.id,
      userId
    });

    this.triggerStatusChangeEvent({
      proposalId: proposalData.id,
      newStatus: proposalData.status,
      userId,
      userRole,
      changeType: 'create'
    });
  }

  /**
   * Handle proposal deletion with cache invalidation
   */
  static triggerProposalDeleted(proposalId: string, userId: string, userRole: string): void {
    this.logger.info('Triggering proposal deleted event', {
      proposalId,
      userId
    });

    this.triggerStatusChangeEvent({
      proposalId,
      userId,
      userRole,
      changeType: 'delete'
    });
  }

  /**
   * Get invalidation statistics for debugging
   */
  static getInvalidationStats(): {
    eventsSent: number;
    lastEventTime: number | null;
    averageEventInterval: number;
  } {
    // This would be implemented with actual tracking
    return {
      eventsSent: 0,
      lastEventTime: null,
      averageEventInterval: 0
    };
  }

  /**
   * Track status changes for analytics
   */
  private static trackStatusChange(data: ProposalEventData): void {
    // Analytics tracking would go here
    this.logger.debug('Status change tracked', {
      proposalId: data.proposalId,
      fromStatus: data.previousStatus,
      toStatus: data.newStatus,
      changeType: data.changeType
    });
  }
}

/**
 * React hook for using the enhanced status update service
 */
export function useEnhancedStatusUpdates() {
  const cacheManager = useProposalCacheManager({
    enableRealtime: true,
    enableOptimisticUpdates: true,
    enableCrossTabSync: true
  });

  return {
    updateStatus: EnhancedStatusUpdateService.updateStatusWithCacheInvalidation,
    batchUpdateStatuses: EnhancedStatusUpdateService.batchUpdateStatuses,
    triggerCreated: EnhancedStatusUpdateService.triggerProposalCreated,
    triggerDeleted: EnhancedStatusUpdateService.triggerProposalDeleted,
    getStats: EnhancedStatusUpdateService.getInvalidationStats,
    cacheManager
  };
}