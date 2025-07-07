
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

    // Phase 5: Use optimized real-time service
    import('@/services/optimizedRealtimeService').then(({ OptimizedRealtimeService }) => {
      subscriptionRef.current = OptimizedRealtimeService.subscribeToProposalChanges(
        user.id,
        user.role || 'client',
        () => {
          console.log('Optimized real-time update - triggering refresh');
          onDataChange();
        }
      );
    });
  }, [user, onDataChange]);

  const cleanup = useCallback(() => {
    if (subscriptionRef.current && user) {
      // Phase 5: Use optimized cleanup
      import('@/services/optimizedRealtimeService').then(({ OptimizedRealtimeService }) => {
        OptimizedRealtimeService.unsubscribe(`proposals-${user.id}-${user.role || 'client'}`);
      });
      subscriptionRef.current = null;
    }
  }, [user]);

  useEffect(() => {
    setupRealtimeSubscription();
    return cleanup;
  }, [setupRealtimeSubscription, cleanup]);

  return { cleanup };
}
