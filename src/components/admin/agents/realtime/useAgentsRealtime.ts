import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useCacheInvalidation, isInCooldown } from '@/hooks/query/useCacheInvalidation';
import { devLogger } from '@/lib/performance/ConsoleReplacementUtility';
import { RealtimeChannel } from '@supabase/supabase-js';

export function useAgentsRealtime() {
  const { toast } = useToast();
  const { invalidateAgentManagement } = useCacheInvalidation();
  const channelRef = useRef<RealtimeChannel | null>(null);

  const toastRef = useRef(toast);
  const invalidateRef = useRef(invalidateAgentManagement);
  toastRef.current = toast;
  invalidateRef.current = invalidateAgentManagement;

  useEffect(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    let activityDebounce: NodeJS.Timeout | null = null;
    let proposalsDebounce: NodeJS.Timeout | null = null;

    const channel = supabase
      .channel('partner-management-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
          filter: 'role=eq.agent',
        },
        async (payload) => {
          devLogger.realtime.info('Partner profile change detected:', payload);
          if (isInCooldown('agent-management')) return;

          await invalidateRef.current();

          if (payload.eventType === 'INSERT') {
            const n = payload.new as any;
            toastRef.current({
              title: 'New Partner Added',
              description: `${n.first_name ?? ''} ${n.last_name ?? ''} has been added to the system.`,
            });
          } else if (payload.eventType === 'UPDATE') {
            const u = payload.new as any;
            const o = payload.old as any;
            if (o.agent_status !== u.agent_status) {
              toastRef.current({
                title: 'Partner Status Updated',
                description: `${u.first_name ?? ''} ${u.last_name ?? ''}'s status changed to ${u.agent_status}.`,
              });
            }
          }
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'proposals' },
        (payload) => {
          devLogger.realtime.info('Proposal change detected (partners view):', payload);
          // Only invalidate when signed_at flips or row added/removed — that's what affects partner stats.
          const o = payload.old as any;
          const n = payload.new as any;
          if (
            payload.eventType === 'INSERT' ||
            payload.eventType === 'DELETE' ||
            (payload.eventType === 'UPDATE' && o?.signed_at !== n?.signed_at) ||
            (payload.eventType === 'UPDATE' && o?.deleted_at !== n?.deleted_at)
          ) {
            if (proposalsDebounce) clearTimeout(proposalsDebounce);
            proposalsDebounce = setTimeout(() => invalidateRef.current(), 1500);
          }
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'agent_activities' },
        () => {
          if (activityDebounce) clearTimeout(activityDebounce);
          activityDebounce = setTimeout(() => invalidateRef.current(), 2000);
        },
      )
      .subscribe();

    channelRef.current = channel;
    devLogger.realtime.info('Realtime subscriptions established for partner management');

    return () => {
      if (activityDebounce) clearTimeout(activityDebounce);
      if (proposalsDebounce) clearTimeout(proposalsDebounce);
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, []);
}
