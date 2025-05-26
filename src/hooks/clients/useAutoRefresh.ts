
import { useEffect, useRef, useCallback } from 'react';

interface UseAutoRefreshProps {
  enabled: boolean;
  interval: number;
  onRefresh: () => void;
}

export function useAutoRefresh({ enabled, interval, onRefresh }: UseAutoRefreshProps) {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const setupAutoRefresh = useCallback(() => {
    // Clear existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (enabled && interval > 0) {
      intervalRef.current = setInterval(() => {
        console.log('Auto-refresh triggered');
        onRefresh();
      }, interval);
    }
  }, [enabled, interval, onRefresh]);

  const cleanup = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    setupAutoRefresh();
    return cleanup;
  }, [setupAutoRefresh, cleanup]);

  return { cleanup };
}
