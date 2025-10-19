import { useEffect, useRef } from 'react';
import { dashboardPerformanceMonitor } from '@/lib/performance/DashboardPerformanceMonitor';
import { logger } from '@/lib/logger';

/**
 * Phase 7: Hook to automatically track dashboard performance
 */
export function useDashboardPerformanceTracking(componentName: string) {
  const renderStartTime = useRef<number>(performance.now());
  const isFirstRender = useRef<boolean>(true);

  useEffect(() => {
    if (isFirstRender.current) {
      const renderTime = performance.now() - renderStartTime.current;
      
      const endRender = dashboardPerformanceMonitor.startRender(componentName);
      endRender();

      logger.info(`[Performance] ${componentName} first render`, {
        duration: `${renderTime.toFixed(2)}ms`
      });

      isFirstRender.current = false;
    }
  }, [componentName]);

  return {
    trackDataFetch: (queryName: string) => 
      dashboardPerformanceMonitor.startDataFetch(queryName),
    trackCalculation: (duration: number) => 
      dashboardPerformanceMonitor.trackMetricsCalculation(duration),
    completeSession: () => 
      dashboardPerformanceMonitor.completeSession()
  };
}
