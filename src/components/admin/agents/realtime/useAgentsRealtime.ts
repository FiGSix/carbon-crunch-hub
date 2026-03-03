import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useCacheInvalidation } from '@/hooks/query/useCacheInvalidation';
import { devLogger } from '@/lib/performance/ConsoleReplacementUtility';
import { RealtimeChannel } from '@supabase/supabase-js';

export function useAgentsRealtime() {
  const { toast } = useToast();
  const { invalidateAgentManagement } = useCacheInvalidation();
  const channelRef = useRef<RealtimeChannel | null>(null);
  
  // Use refs to avoid re-subscribing when these change
  const toastRef = useRef(toast);
  const invalidateRef = useRef(invalidateAgentManagement);
  toastRef.current = toast;
  invalidateRef.current = invalidateAgentManagement;

  useEffect(() => {
    // Clean up previous subscription if it exists
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    let activityDebounce: NodeJS.Timeout | null = null;

    const channel = supabase
      .channel('agent-management-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
          filter: 'role=eq.agent'
        },
        async (payload) => {
          devLogger.realtime.info('Agent profile change detected:', payload);
          
          await invalidateRef.current();
          
          if (payload.eventType === 'INSERT') {
            const newAgent = payload.new as any;
            toastRef.current({
              title: "New Agent Added",
              description: `${newAgent.first_name} ${newAgent.last_name} has been added to the system.`,
            });
          } else if (payload.eventType === 'UPDATE') {
            const updatedAgent = payload.new as any;
            const oldAgent = payload.old as any;
            
            if (oldAgent.agent_status !== updatedAgent.agent_status) {
              toastRef.current({
                title: "Agent Status Updated",
                description: `${updatedAgent.first_name} ${updatedAgent.last_name}'s status changed to ${updatedAgent.agent_status}.`,
              });
            } else if (oldAgent.commission_override !== updatedAgent.commission_override) {
              toastRef.current({
                title: "Commission Updated",
                description: `${updatedAgent.first_name} ${updatedAgent.last_name}'s commission has been updated.`,
              });
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'agent_activities'
        },
        (payload) => {
          devLogger.realtime.info('Agent activity change detected:', payload);
          
          // Debounce activity updates to prevent rapid-fire invalidations
          if (activityDebounce) clearTimeout(activityDebounce);
          activityDebounce = setTimeout(() => {
            invalidateRef.current();
          }, 2000);
        }
      )
      .subscribe();

    channelRef.current = channel;
    devLogger.realtime.info('Realtime subscriptions established for agent management');

    return () => {
      if (activityDebounce) clearTimeout(activityDebounce);
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, []); // Empty deps - refs handle current values
}
