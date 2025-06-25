
import { useEffect, useRef, useCallback } from 'react';

interface PerformanceMetrics {
  renderTime: number;
  componentName: string;
  renderCount: number;
}

interface UsePerformanceMonitorOptions {
  componentName: string;
  enabled?: boolean;
  logThreshold?: number; // Log if render time exceeds this (ms)
}

export function usePerformanceMonitor(
  dependencies: any[],
  options: UsePerformanceMonitorOptions
) {
  const { componentName, enabled = process.env.NODE_ENV === 'development', logThreshold = 50 } = options;
  const renderStartTime = useRef<number>(0);
  const renderCount = useRef<number>(0);
  const lastLogTime = useRef<number>(0);

  useEffect(() => {
    if (!enabled) return;

    renderStartTime.current = performance.now();
    renderCount.current += 1;

    return () => {
      const renderTime = performance.now() - renderStartTime.current;
      const now = Date.now();

      // Only log if render time exceeds threshold or it's been 5 seconds since last log
      if (renderTime > logThreshold || now - lastLogTime.current > 5000) {
        console.log(`🎯 ${componentName} render: ${renderTime.toFixed(2)}ms (count: ${renderCount.current})`);
        lastLogTime.current = now;
      }
    };
  }, dependencies);

  const getMetrics = useCallback((): PerformanceMetrics => ({
    renderTime: performance.now() - renderStartTime.current,
    componentName,
    renderCount: renderCount.current
  }), [componentName]);

  return { getMetrics, renderCount: renderCount.current };
}
