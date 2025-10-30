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

  useEffect(() => {
    // Clean up previous subscription if it exists
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

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
          
          // Invalidate and refetch agent management queries
          await invalidateAgentManagement();
          
          // Show notification based on event type
          if (payload.eventType === 'INSERT') {
            const newAgent = payload.new as any;
            toast({
              title: "New Agent Added",
              description: `${newAgent.first_name} ${newAgent.last_name} has been added to the system.`,
            });
          } else if (payload.eventType === 'UPDATE') {
            const updatedAgent = payload.new as any;
            const oldAgent = payload.old as any;
            
            // Check what was updated
            if (oldAgent.agent_status !== updatedAgent.agent_status) {
              toast({
                title: "Agent Status Updated",
                description: `${updatedAgent.first_name} ${updatedAgent.last_name}'s status changed to ${updatedAgent.agent_status}.`,
              });
            } else if (oldAgent.commission_override !== updatedAgent.commission_override) {
              toast({
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
        async (payload) => {
          devLogger.realtime.info('Agent activity change detected:', payload);
          
          // Invalidate agent management queries to reflect activity changes
          await invalidateAgentManagement();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'proposals',
        },
        async (payload) => {
          devLogger.realtime.info('Proposal change detected:', payload);
          
          // Invalidate queries as proposal changes affect agent stats
          await invalidateAgentManagement();
        }
      )
      .subscribe();

    // Store channel reference
    channelRef.current = channel;

    // Enable realtime for the tables
    const enableRealtime = async () => {
      try {
        // Enable replica identity for real-time updates
        await supabase.rpc('test_rls_policies'); // This will ensure functions exist
        
        devLogger.realtime.info('Realtime subscriptions established for agent management');
      } catch (error) {
        devLogger.realtime.error('Error setting up realtime:', error);
      }
    };

    enableRealtime();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [toast, invalidateAgentManagement]);
}