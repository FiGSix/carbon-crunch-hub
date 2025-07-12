import { supabase } from '@/integrations/supabase/client';
import { BaseSubscriptionManager } from './baseSubscriptionManager';
import { DebounceUtils } from './debounceUtils';

/**
 * Agent management subscription utilities
 */
export class AgentSubscriptions extends BaseSubscriptionManager {
  /**
   * Optimized agent management subscriptions (admin only)
   */
  static subscribeToAgentChanges(onUpdate: (payload: any) => void) {
    const channelKey = 'agent-management-optimized';
    
    return this.createOrReuseSubscription(channelKey, () => {
      this.logger.info('Creating optimized agent management subscription');

      return supabase
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
              DebounceUtils.debounceUpdate(channelKey, onUpdate, payload);
            }
          }
        )
        .subscribe();
    });
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