/**
 * Performance optimization exports
 * Comprehensive Performance & Reliability Optimization Plan implementation
 */

export { 
  performanceMonitor, 
  usePerformanceTracking, 
  withPerformanceTracking,
  type PerformanceMetrics,
  type ComponentMetrics 
} from './PerformanceMonitor';

export { 
  OptimizedLoader, 
  createOptimizedLazyComponent, 
  preloadComponent,
  withOptimizedRouteLoading 
} from './OptimizedLoader';

export { 
  bundleOptimizer, 
  useRoutePreloader, 
  withPreloading 
} from './BundleOptimizer';

export { 
  useBundleOptimization, 
  useComponentOptimization 
} from '../../hooks/useBundleOptimization';

import { performanceMonitor } from './PerformanceMonitor';
import { bundleOptimizer } from './BundleOptimizer';

// Global performance utilities
export const performanceUtils = {
  /**
   * Phase 1: Immediate Performance Fixes
   */
  disableConsoleInProduction() {
    if (import.meta.env.PROD) {
      console.log = () => {};
      console.warn = () => {};
      console.info = () => {};
      // Keep console.error for critical issues
    }
  },

  /**
   * Phase 2: Memory Management
   */
  scheduleCleanup(cleanupFn: () => void, delay: number = 30000) {
    return setTimeout(cleanupFn, delay);
  },

  /**
   * Phase 3: Bundle Optimization
   */
  measureBundleImpact(componentName: string) {
    const startTime = performance.now();
    return {
      end: () => {
        const endTime = performance.now();
        if (import.meta.env.DEV) {
          console.log(`📦 ${componentName} loaded in ${(endTime - startTime).toFixed(1)}ms`);
        }
      }
    };
  },

  /**
   * Phase 4: Performance Monitoring
   */
  generateFullReport() {
    return performanceMonitor.generateReport();
  },

  /**
   * Get overall app health score including bundle optimization
   */
  getHealthScore(): number {
    const baseScore = performanceMonitor.getPerformanceScore();
    const bundleStats = bundleOptimizer.getStats();
    
    // Boost score based on optimization
    const optimizationBonus = bundleStats.isOptimized ? 10 : 0;
    return Math.min(100, baseScore + optimizationBonus);
  },

  /**
   * Get comprehensive performance report including bundle optimization
   */
  getComprehensiveReport() {
    return {
      performance: performanceMonitor.generateReport(),
      bundleOptimization: bundleOptimizer.getStats(),
      healthScore: this.getHealthScore(),
      recommendations: this.getOptimizationRecommendations()
    };
  },

  /**
   * Get optimization recommendations
   */
  getOptimizationRecommendations() {
    const bundleStats = bundleOptimizer.getStats();
    const recommendations = [];

    if (!bundleStats.isOptimized) {
      recommendations.push('Enable route preloading for better performance');
    }
    
    if (bundleStats.preloadedRoutes.length < 3) {
      recommendations.push('Consider preloading more frequently accessed routes');
    }

    return recommendations;
  }
};

// Initialize performance monitoring
if (typeof window !== 'undefined') {
  // Auto-disable console logs in production
  performanceUtils.disableConsoleInProduction();
  
  // Add global performance commands for debugging
  if (import.meta.env.DEV) {
    (window as any).performanceReport = () => {
      console.log(performanceUtils.generateFullReport());
    };
    (window as any).performanceScore = () => {
      console.log(`Performance Score: ${performanceUtils.getHealthScore()}/100`);
    };
  }
}
