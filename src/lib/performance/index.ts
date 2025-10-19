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
  optimizedMotionConfig,
  optimizedHover,
  chartAnimation,
  staggerConfig
} from './motion-config';

export {
  dashboardPerformanceMonitor,
  type DashboardPerformanceMetrics
} from './DashboardPerformanceMonitor';

import { performanceMonitor } from './PerformanceMonitor';

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
   * Get overall app health score
   */
  getHealthScore(): number {
    return performanceMonitor.getPerformanceScore();
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
