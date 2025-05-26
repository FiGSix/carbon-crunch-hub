
import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UseRealtimeSubscriptionProps {
  user: any;
  onDataChange: () => void;
}

export function useRealtimeSubscription({ user, onDataChange }: UseRealtimeSubscriptionProps) {
  const subscriptionRef = useRef<any>(null);

  const setupRealtimeSubscription = useCallback(() => {
    if (!user) return;

    console.log('Setting up real-time subscription for proposals');
    
    subscriptionRef.current = supabase
      .channel('proposals-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'proposals'
        },
        (payload) => {
          console.log('Real-time update received:', payload);
          // Debounce the refresh to avoid too many updates
          setTimeout(() => {
            console.log('Triggering refresh from real-time update');
            onDataChange();
          }, 1000);
        }
      )
      .subscribe();
  }, [user, onDataChange]);

  const cleanup = useCallback(() => {
    if (subscriptionRef.current) {
      supabase.removeChannel(subscriptionRef.current);
      subscriptionRef.current = null;
    }
  }, []);

  useEffect(() => {
    setupRealtimeSubscription();
    return cleanup;
  }, [setupRealtimeSubscription, cleanup]);

  return { cleanup };
}
