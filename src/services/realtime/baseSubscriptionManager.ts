import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

/**
 * Base subscription manager for handling subscription lifecycle
 */
export class BaseSubscriptionManager {
  protected static logger = logger.withContext({ 
    component: 'BaseSubscriptionManager', 
    feature: 'realtime-optimization' 
  });
  
  protected static activeChannels = new Map<string, any>();
  protected static subscriptionCounts = new Map<string, number>();

  /**
   * Create or reuse an existing subscription
   */
  protected static createOrReuseSubscription(
    channelKey: string,
    subscriptionFactory: () => any
  ): any {
    // Reuse existing channel if available
    if (this.activeChannels.has(channelKey)) {
      const count = this.subscriptionCounts.get(channelKey) || 0;
      this.subscriptionCounts.set(channelKey, count + 1);
      this.logger.info('Reusing existing subscription', { channelKey, count: count + 1 });
      return this.activeChannels.get(channelKey);
    }

    // Create new subscription
    const channel = subscriptionFactory();
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
        this.logger.info('Removed subscription', { channelKey });
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
    this.logger.info('Cleaning up all subscriptions');
    
    for (const channel of this.activeChannels.values()) {
      supabase.removeChannel(channel);
    }
    
    this.activeChannels.clear();
    this.subscriptionCounts.clear();
  }
}