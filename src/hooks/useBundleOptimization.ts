/**
 * Hook for monitoring bundle optimization performance
 * Tracks loading times, chunk sizes, and optimization effectiveness
 */

import { useState, useEffect, useCallback } from 'react';
import { bundleOptimizer } from '@/lib/performance/BundleOptimizer';

interface BundleMetrics {
  loadTimes: { [key: string]: number };
  chunkSizes: { [key: string]: number };
  preloadedRoutes: string[];
  cacheHitRate: number;
  totalOptimizationTime: number;
}

interface OptimizationStats {
  isOptimized: boolean;
  preloadedCount: number;
  estimatedSavings: number;
  performanceScore: number;
}

export function useBundleOptimization() {
  const [metrics, setMetrics] = useState<BundleMetrics>({
    loadTimes: {},
    chunkSizes: {},
    preloadedRoutes: [],
    cacheHitRate: 0,
    totalOptimizationTime: 0
  });

  const [stats, setStats] = useState<OptimizationStats>({
    isOptimized: false,
    preloadedCount: 0,
    estimatedSavings: 0,
    performanceScore: 0
  });

  // Track performance metrics
  const trackLoadTime = useCallback((routeName: string, loadTime: number) => {
    setMetrics(prev => ({
      ...prev,
      loadTimes: {
        ...prev.loadTimes,
        [routeName]: loadTime
      }
    }));
  }, []);

  // Preload route with tracking
  const preloadRouteWithTracking = useCallback(async (routeName: string) => {
    const startTime = performance.now();
    
    try {
      await bundleOptimizer.preloadRoute(routeName);
      const loadTime = performance.now() - startTime;
      trackLoadTime(routeName, loadTime);
      
      // Update stats
      const optimizerStats = bundleOptimizer.getStats();
      setStats(prev => ({
        ...prev,
        isOptimized: optimizerStats.isOptimized,
        preloadedCount: optimizerStats.preloadedRoutes.length,
        estimatedSavings: prev.estimatedSavings + loadTime
      }));
      
    } catch (error) {
      console.warn(`Failed to preload route ${routeName}:`, error);
    }
  }, [trackLoadTime]);

  // Calculate performance score
  const calculatePerformanceScore = useCallback(() => {
    const { loadTimes } = metrics;
    const averageLoadTime = Object.values(loadTimes).reduce((sum, time) => sum + time, 0) / Object.values(loadTimes).length;
    
    if (!averageLoadTime) return 0;
    
    // Score based on load time (lower is better)
    // 100ms = 100, 200ms = 90, 500ms = 70, 1000ms = 50
    const score = Math.max(0, 100 - (averageLoadTime / 10));
    
    setStats(prev => ({
      ...prev,
      performanceScore: Math.round(score)
    }));
    
    return score;
  }, [metrics]);

  // Monitor performance
  useEffect(() => {
    const interval = setInterval(() => {
      calculatePerformanceScore();
      
      // Update metrics from bundle optimizer
      const optimizerStats = bundleOptimizer.getStats();
      setMetrics(prev => ({
        ...prev,
        preloadedRoutes: optimizerStats.preloadedRoutes
      }));
    }, 5000);

    return () => clearInterval(interval);
  }, [calculatePerformanceScore]);

  // Measure initial load performance
  useEffect(() => {
    // Track initial page load
    if (typeof window !== 'undefined' && window.performance) {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      if (navigation) {
        const initialLoadTime = navigation.loadEventEnd - navigation.fetchStart;
        trackLoadTime('initial', initialLoadTime);
      }
    }
  }, [trackLoadTime]);

  return {
    metrics,
    stats,
    preloadRoute: preloadRouteWithTracking,
    trackLoadTime,
    getOptimizationReport: () => ({
      ...stats,
      averageLoadTime: Object.values(metrics.loadTimes).reduce((sum, time) => sum + time, 0) / Object.values(metrics.loadTimes).length || 0,
      totalRoutes: Object.keys(metrics.loadTimes).length,
      recommendation: stats.performanceScore < 70 ? 'Consider additional optimization' : 'Performance is optimal'
    })
  };
}

// Component-level optimization hook
export function useComponentOptimization(componentName: string) {
  const [loadTime, setLoadTime] = useState<number>(0);
  const [isOptimized, setIsOptimized] = useState(false);

  useEffect(() => {
    const startTime = performance.now();
    
    // Mark component as loaded
    const endTime = performance.now();
    const duration = endTime - startTime;
    setLoadTime(duration);
    
    // Check if component benefits from optimization
    setIsOptimized(duration < 50); // Components loading under 50ms are considered optimized
    
  }, []);

  return {
    loadTime,
    isOptimized,
    componentName
  };
}