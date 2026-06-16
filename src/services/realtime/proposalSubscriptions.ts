import { supabase } from '@/integrations/supabase/client';
import { BaseSubscriptionManager } from './baseSubscriptionManager';
import { DebounceUtils } from './debounceUtils';

/**
 * Proposal-specific subscription management
 */
export class ProposalSubscriptions extends BaseSubscriptionManager {
  /**
   * Optimized proposal subscriptions with user-specific filtering
   */
  static subscribeToProposalChanges(
    userId: string, 
    userRole: string, 
    onUpdate: (payload: any) => void
  ) {
    const channelKey = `proposals-${userId}-${userRole}`;
    
    return this.createOrReuseSubscription(channelKey, () => {
      this.logger.info('Creating optimized proposal subscription', { userId, userRole });

      return supabase
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
            
            // Optimized debounce: Status changes need faster feedback
            const debounceTime = payload.eventType === 'UPDATE' && 
              payload.new?.status !== payload.old?.status ? 300 : 1000;
            
            DebounceUtils.debounceUpdate(channelKey, onUpdate, payload, debounceTime);
          }
        )
        .subscribe();
    });
  }
}