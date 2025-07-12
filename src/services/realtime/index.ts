import { ProposalSubscriptions } from './proposalSubscriptions';
import { NotificationSubscriptions } from './notificationSubscriptions';
import { AgentSubscriptions } from './agentSubscriptions';
import { BaseSubscriptionManager } from './baseSubscriptionManager';

/**
 * Main OptimizedRealtimeService - maintains the original API
 * This serves as the public interface while delegating to specialized modules
 */
export class OptimizedRealtimeService {
  /**
   * Optimized proposal subscriptions with user-specific filtering
   */
  static subscribeToProposalChanges(
    userId: string, 
    userRole: string, 
    onUpdate: (payload: any) => void
  ) {
    return ProposalSubscriptions.subscribeToProposalChanges(userId, userRole, onUpdate);
  }

  /**
   * Optimized notification subscriptions with enhanced deduplication
   */
  static subscribeToNotificationChanges(userId: string, onUpdate: (payload: any) => void) {
    return NotificationSubscriptions.subscribeToNotificationChanges(userId, onUpdate);
  }

  /**
   * Optimized agent management subscriptions (admin only)
   */
  static subscribeToAgentChanges(onUpdate: (payload: any) => void) {
    return AgentSubscriptions.subscribeToAgentChanges(onUpdate);
  }

  /**
   * Unsubscribe with reference counting
   */
  static unsubscribe(channelKey: string) {
    return BaseSubscriptionManager.unsubscribe(channelKey);
  }

  /**
   * Clean up all subscriptions
   */
  static cleanup() {
    return BaseSubscriptionManager.cleanup();
  }
}

// Export everything for flexibility
export { ProposalSubscriptions } from './proposalSubscriptions';
export { NotificationSubscriptions } from './notificationSubscriptions';
export { AgentSubscriptions } from './agentSubscriptions';
export { BaseSubscriptionManager } from './baseSubscriptionManager';
export { DebounceUtils } from './debounceUtils';
export { EnhancedRealtimeService } from './enhancedRealtimeService';
export { WebSocketManager } from './websocketManager';
export * from './types';