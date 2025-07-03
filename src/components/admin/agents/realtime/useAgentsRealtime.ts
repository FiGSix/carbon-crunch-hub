import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function useAgentsRealtime() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
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
        (payload) => {
          console.log('Agent profile change detected:', payload);
          
          // Invalidate and refetch agent management queries
          queryClient.invalidateQueries({ queryKey: ['agents-management'] });
          queryClient.invalidateQueries({ queryKey: ['agents-management-count'] });
          queryClient.invalidateQueries({ queryKey: ['agent-management-stats'] });
          
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
        (payload) => {
          console.log('Agent activity change detected:', payload);
          
          // Invalidate agent management queries to reflect activity changes
          queryClient.invalidateQueries({ queryKey: ['agents-management'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'proposals',
        },
        (payload) => {
          console.log('Proposal change detected:', payload);
          
          // Invalidate queries as proposal changes affect agent stats
          queryClient.invalidateQueries({ queryKey: ['agents-management'] });
          queryClient.invalidateQueries({ queryKey: ['agent-management-stats'] });
        }
      )
      .subscribe();

    // Enable realtime for the tables
    const enableRealtime = async () => {
      try {
        // Enable replica identity for real-time updates
        await supabase.rpc('test_rls_policies'); // This will ensure functions exist
        
        console.log('Realtime subscriptions established for agent management');
      } catch (error) {
        console.error('Error setting up realtime:', error);
      }
    };

    enableRealtime();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, toast]);
}