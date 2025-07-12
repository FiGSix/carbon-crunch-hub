import { supabase } from '@/integrations/supabase/client';
import { BaseSubscriptionManager } from './baseSubscriptionManager';
import { DebounceUtils } from './debounceUtils';

/**
 * Notification-specific subscription management
 */
export class NotificationSubscriptions extends BaseSubscriptionManager {
  /**
   * Optimized notification subscriptions with enhanced deduplication
   */
  static subscribeToNotificationChanges(userId: string, onUpdate: (payload: any) => void) {
    const channelKey = `notifications-${userId}`;
    
    return this.createOrReuseSubscription(channelKey, () => {
      this.logger.info('Creating optimized notification subscription', { userId });

      return supabase
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
            this.logger.info('New notification received', { userId, event: payload.eventType });
            
            // Debounce notifications to prevent excessive updates
            DebounceUtils.debounceUpdate(
              `${channelKey}-notification`, 
              onUpdate, 
              payload, 
              1500 // 1.5 second debounce for notifications
            );
          }
        )
        .subscribe();
    });
  }
}