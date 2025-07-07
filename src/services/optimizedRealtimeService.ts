import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

/**
 * Phase 5 Optimization: Optimized real-time subscription service
 * Reduces subscription overhead and improves filtering
 */
export class OptimizedRealtimeService {
  private static logger = logger.withContext({ 
    component: 'OptimizedRealtimeService', 
    feature: 'realtime-optimization' 
  });
  
  private static activeChannels = new Map<string, any>();
  private static subscriptionCounts = new Map<string, number>();

  /**
   * Optimized proposal subscriptions with user-specific filtering
   */
  static subscribeToProposalChanges(
    userId: string, 
    userRole: string, 
    onUpdate: (payload: any) => void
  ) {
    const channelKey = `proposals-${userId}-${userRole}`;
    
    // Reuse existing channel if available
    if (this.activeChannels.has(channelKey)) {
      const count = this.subscriptionCounts.get(channelKey) || 0;
      this.subscriptionCounts.set(channelKey, count + 1);
      this.logger.info('Reusing existing proposal subscription', { channelKey, count: count + 1 });
      return this.activeChannels.get(channelKey);
    }

    this.logger.info('Creating optimized proposal subscription', { userId, userRole });

    const channel = supabase
      .channel(channelKey)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'proposals',
          // Use database-level filtering to reduce network traffic
          filter: userRole === 'agent' 
            ? `agent_id=eq.${userId}` 
            : userRole === 'client'
            ? `or(client_id.eq.${userId},client_reference_id.eq.${userId})`
            : undefined // Admin gets all changes
        },
        (payload) => {
          this.logger.info('Optimized proposal change received', { 
            event: payload.eventType,
            table: payload.table,
            userId 
          });
          
          // Debounce updates to prevent excessive re-renders
          this.debounceUpdate(channelKey, onUpdate, payload);
        }
      )
      .subscribe();

    this.activeChannels.set(channelKey, channel);
    this.subscriptionCounts.set(channelKey, 1);
    
    return channel;
  }

  /**
   * Optimized notification subscriptions
   */
  static subscribeToNotificationChanges(userId: string, onUpdate: (payload: any) => void) {
    const channelKey = `notifications-${userId}`;
    
    if (this.activeChannels.has(channelKey)) {
      const count = this.subscriptionCounts.get(channelKey) || 0;
      this.subscriptionCounts.set(channelKey, count + 1);
      return this.activeChannels.get(channelKey);
    }

    this.logger.info('Creating optimized notification subscription', { userId });

    const channel = supabase
      .channel(channelKey)
      .on(
        'postgres_changes',
        {
          event: 'INSERT', // Only listen for new notifications
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          this.logger.info('New notification received', { userId });
          onUpdate(payload);
        }
      )
      .subscribe();

    this.activeChannels.set(channelKey, channel);
    this.subscriptionCounts.set(channelKey, 1);
    
    return channel;
  }

  /**
   * Optimized agent management subscriptions (admin only)
   */
  static subscribeToAgentChanges(onUpdate: (payload: any) => void) {
    const channelKey = 'agent-management-optimized';
    
    if (this.activeChannels.has(channelKey)) {
      const count = this.subscriptionCounts.get(channelKey) || 0;
      this.subscriptionCounts.set(channelKey, count + 1);
      return this.activeChannels.get(channelKey);
    }

    this.logger.info('Creating optimized agent management subscription');

    const channel = supabase
      .channel(channelKey)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
          filter: 'role=eq.agent'
        },
        (payload) => {
          this.logger.info('Agent profile change received', { 
            event: payload.eventType 
          });
          
          // Only refresh if it's a meaningful change
          if (this.isMeaningfulAgentChange(payload)) {
            this.debounceUpdate(channelKey, onUpdate, payload);
          }
        }
      )
      .subscribe();

    this.activeChannels.set(channelKey, channel);
    this.subscriptionCounts.set(channelKey, 1);
    
    return channel;
  }

  /**
   * Unsubscribe with reference counting
   */
  static unsubscribe(channelKey: string) {
    const count = this.subscriptionCounts.get(channelKey) || 0;
    
    if (count <= 1) {
      // Last subscriber - remove the channel
      const channel = this.activeChannels.get(channelKey);
      if (channel) {
        supabase.removeChannel(channel);
        this.activeChannels.delete(channelKey);
        this.subscriptionCounts.delete(channelKey);
        this.logger.info('Removed optimized subscription', { channelKey });
      }
    } else {
      // Decrement reference count
      this.subscriptionCounts.set(channelKey, count - 1);
      this.logger.info('Decremented subscription count', { 
        channelKey, 
        count: count - 1 
      });
    }
  }

  /**
   * Clean up all subscriptions
   */
  static cleanup() {
    this.logger.info('Cleaning up all optimized subscriptions');
    
    for (const channel of this.activeChannels.values()) {
      supabase.removeChannel(channel);
    }
    
    this.activeChannels.clear();
    this.subscriptionCounts.clear();
  }

  /**
   * Debounce updates to prevent excessive re-renders
   */
  private static updateTimeouts = new Map<string, NodeJS.Timeout>();
  
  private static debounceUpdate(
    key: string, 
    callback: (payload: any) => void, 
    payload: any, 
    delay = 500
  ) {
    // Clear existing timeout
    const existingTimeout = this.updateTimeouts.get(key);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Set new timeout
    const timeout = setTimeout(() => {
      callback(payload);
      this.updateTimeouts.delete(key);
    }, delay);

    this.updateTimeouts.set(key, timeout);
  }

  /**
   * Determine if an agent change is meaningful enough to trigger updates
   */
  private static isMeaningfulAgentChange(payload: any): boolean {
    if (payload.eventType === 'INSERT' || payload.eventType === 'DELETE') {
      return true;
    }

    if (payload.eventType === 'UPDATE') {
      const meaningfulFields = [
        'agent_status', 
        'commission_override', 
        'first_name', 
        'last_name',
        'access_level'
      ];
      
      return meaningfulFields.some(field => 
        payload.old?.[field] !== payload.new?.[field]
      );
    }

    return false;
  }
}