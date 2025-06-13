
import { useEffect, useRef, useState } from 'react';

interface PerformanceMetrics {
  renderTime: number;
  apiCallTime: number;
  cacheHitRate: number;
  memoryUsage: number;
}

interface UsePerformanceOptimizationOptions {
  trackRenders?: boolean;
  trackApiCalls?: boolean;
  logMetrics?: boolean;
}

export function usePerformanceOptimization({
  trackRenders = true,
  trackApiCalls = true,
  logMetrics = false
}: UsePerformanceOptimizationOptions = {}) {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    renderTime: 0,
    apiCallTime: 0,
    cacheHitRate: 0,
    memoryUsage: 0
  });

  const renderStartTime = useRef<number>(0);
  const apiCallStartTime = useRef<number>(0);
  const apiCallCount = useRef<number>(0);
  const cacheHitCount = useRef<number>(0);

  // Track render performance
  useEffect(() => {
    if (!trackRenders) return;

    renderStartTime.current = performance.now();
    
    return () => {
      const renderTime = performance.now() - renderStartTime.current;
      setMetrics(prev => ({ ...prev, renderTime }));
      
      if (logMetrics) {
        console.log(`Render time: ${renderTime.toFixed(2)}ms`);
      }
    };
  });

  // API call tracking utilities
  const trackApiCall = {
    start: () => {
      if (trackApiCalls) {
        apiCallStartTime.current = performance.now();
        apiCallCount.current++;
      }
    },
    end: (wasCacheHit = false) => {
      if (!trackApiCalls) return;

      const apiCallTime = performance.now() - apiCallStartTime.current;
      
      if (wasCacheHit) {
        cacheHitCount.current++;
      }

      const cacheHitRate = apiCallCount.current > 0 
        ? (cacheHitCount.current / apiCallCount.current) * 100 
        : 0;

      setMetrics(prev => ({ 
        ...prev, 
        apiCallTime,
        cacheHitRate 
      }));

      if (logMetrics) {
        console.log(`API call time: ${apiCallTime.toFixed(2)}ms, Cache hit: ${wasCacheHit}`);
      }
    }
  };

  // Memory usage tracking
  useEffect(() => {
    const updateMemoryUsage = () => {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        const memoryUsage = memory.usedJSHeapSize / (1024 * 1024); // Convert to MB
        setMetrics(prev => ({ ...prev, memoryUsage }));
      }
    };

    const interval = setInterval(updateMemoryUsage, 5000); // Check every 5 seconds
    updateMemoryUsage(); // Initial check

    return () => clearInterval(interval);
  }, []);

  // Performance report
  const getPerformanceReport = () => ({
    ...metrics,
    totalApiCalls: apiCallCount.current,
    cacheHits: cacheHitCount.current,
    recommendations: generateRecommendations(metrics)
  });

  return {
    metrics,
    trackApiCall,
    getPerformanceReport
  };
}

function generateRecommendations(metrics: PerformanceMetrics): string[] {
  const recommendations: string[] = [];

  if (metrics.renderTime > 100) {
    recommendations.push('Consider optimizing render performance - render time is above 100ms');
  }

  if (metrics.apiCallTime > 1000) {
    recommendations.push('API calls are slow - consider implementing request caching or reducing payload size');
  }

  if (metrics.cacheHitRate < 50) {
    recommendations.push('Low cache hit rate - review caching strategy');
  }

  if (metrics.memoryUsage > 50) {
    recommendations.push('High memory usage detected - check for memory leaks');
  }

  return recommendations;
}
