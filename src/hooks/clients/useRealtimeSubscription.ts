
import { useEffect, useRef, useCallback } from 'react';
import { OptimizedRealtimeService } from '@/services/optimizedRealtimeService';
import { isInCooldown } from '@/hooks/query/useCacheInvalidation';

interface UseRealtimeSubscriptionProps {
  user: any;
  onDataChange: () => void;
}

export function useRealtimeSubscription({ user, onDataChange }: UseRealtimeSubscriptionProps) {
  const subscriptionRef = useRef<any>(null);

  const setupRealtimeSubscription = useCallback(() => {
    if (!user) return;

    subscriptionRef.current = OptimizedRealtimeService.subscribeToProposalChanges(
      user.id,
      user.role || 'client',
      () => {
        if (isInCooldown('clients')) return;
        onDataChange();
      }
    );
  }, [user, onDataChange]);

  const cleanup = useCallback(() => {
    if (subscriptionRef.current && user) {
      OptimizedRealtimeService.unsubscribe(`proposals-${user.id}-${user.role || 'client'}`);
      subscriptionRef.current = null;
    }
  }, [user]);

  useEffect(() => {
    setupRealtimeSubscription();
    return cleanup;
  }, [setupRealtimeSubscription, cleanup]);

  return { cleanup };
}
