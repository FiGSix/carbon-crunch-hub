import { ComponentType, useEffect, createElement } from 'react';

/**
 * Phase 4: Performance Monitoring & Reliability Service
 * Comprehensive performance tracking and optimization utilities
 */

export interface PerformanceMetrics {
  pageLoadTime: number;
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  cumulativeLayoutShift: number;
  firstInputDelay: number;
  memoryUsage?: number;
  bundleSize?: number;
}

export interface ComponentMetrics {
  name: string;
  renderTime: number;
  rerenderCount: number;
  lastUpdate: number;
}

class PerformanceMonitorService {
  private metrics: PerformanceMetrics = {
    pageLoadTime: 0,
    firstContentfulPaint: 0,
    largestContentfulPaint: 0,
    cumulativeLayoutShift: 0,
    firstInputDelay: 0
  };

  private componentMetrics: Map<string, ComponentMetrics> = new Map();
  private observers: PerformanceObserver[] = [];

  constructor() {
    if (typeof window !== 'undefined') {
      this.initializeObservers();
      this.measureInitialLoad();
    }
  }

  private initializeObservers() {
    try {
      // Only observe in browser environment and throttle to prevent forced reflows
      if ('PerformanceObserver' in window) {
        // Use passive paint observer
        const paintObserver = new PerformanceObserver((list) => {
          // Use requestIdleCallback to avoid blocking main thread
          if ('requestIdleCallback' in window) {
            requestIdleCallback(() => {
              const entries = list.getEntries();
              entries.forEach((entry) => {
                if (entry.name === 'first-contentful-paint') {
                  this.metrics.firstContentfulPaint = entry.startTime;
                }
              });
            });
          } else {
            // Fallback with timeout to avoid forced reflow
            setTimeout(() => {
              const entries = list.getEntries();
              entries.forEach((entry) => {
                if (entry.name === 'first-contentful-paint') {
                  this.metrics.firstContentfulPaint = entry.startTime;
                }
              });
            }, 0);
          }
        });
        paintObserver.observe({ entryTypes: ['paint'], buffered: true });
        this.observers.push(paintObserver);

        // Observe largest contentful paint with passive handling
        const lcpObserver = new PerformanceObserver((list) => {
          if ('requestIdleCallback' in window) {
            requestIdleCallback(() => {
              const entries = list.getEntries();
              if (entries.length > 0) {
                const lastEntry = entries[entries.length - 1];
                this.metrics.largestContentfulPaint = lastEntry.startTime;
              }
            });
          }
        });
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'], buffered: true });
        this.observers.push(lcpObserver);

        // Only observe layout shifts in development to prevent forced reflows in production
        if (import.meta.env.DEV) {
          const clsObserver = new PerformanceObserver((list) => {
            // Throttle layout shift processing to prevent forced reflows
            if ('requestIdleCallback' in window) {
              requestIdleCallback(() => {
                const entries = list.getEntries();
                entries.forEach((entry: any) => {
                  if (!entry.hadRecentInput) {
                    this.metrics.cumulativeLayoutShift += entry.value;
                  }
                });
              });
            }
          });
          clsObserver.observe({ entryTypes: ['layout-shift'], buffered: true });
          this.observers.push(clsObserver);
        }
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.warn('[Performance Monitor] Failed to initialize observers:', error);
      }
    }
  }

  private measureInitialLoad() {
    if (typeof window !== 'undefined' && window.performance) {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      if (navigation) {
        this.metrics.pageLoadTime = navigation.loadEventEnd - navigation.fetchStart;
      }

      // Memory usage if available
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        this.metrics.memoryUsage = memory.usedJSHeapSize;
      }
    }
  }

  /**
   * Track component render performance
   */
  trackComponentRender(componentName: string, renderTime: number) {
    const existing = this.componentMetrics.get(componentName);
    if (existing) {
      existing.rerenderCount++;
      existing.renderTime = renderTime;
      existing.lastUpdate = Date.now();
    } else {
      this.componentMetrics.set(componentName, {
        name: componentName,
        renderTime,
        rerenderCount: 1,
        lastUpdate: Date.now()
      });
    }
  }

  /**
   * Get current performance metrics
   */
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  /**
   * Get component performance metrics
   */
  getComponentMetrics(): ComponentMetrics[] {
    return Array.from(this.componentMetrics.values());
  }

  /**
   * Calculate performance score (0-100)
   */
  getPerformanceScore(): number {
    const { pageLoadTime, firstContentfulPaint, largestContentfulPaint, cumulativeLayoutShift } = this.metrics;
    
    let score = 100;
    
    // Page load time scoring (under 3s = good)
    if (pageLoadTime > 3000) score -= 20;
    else if (pageLoadTime > 1500) score -= 10;
    
    // FCP scoring (under 1.8s = good)
    if (firstContentfulPaint > 1800) score -= 15;
    else if (firstContentfulPaint > 900) score -= 7;
    
    // LCP scoring (under 2.5s = good)
    if (largestContentfulPaint > 2500) score -= 20;
    else if (largestContentfulPaint > 1200) score -= 10;
    
    // CLS scoring (under 0.1 = good)
    if (cumulativeLayoutShift > 0.25) score -= 25;
    else if (cumulativeLayoutShift > 0.1) score -= 10;
    
    return Math.max(0, score);
  }

  /**
   * Generate performance report
   */
  generateReport(): string {
    const metrics = this.getMetrics();
    const score = this.getPerformanceScore();
    const components = this.getComponentMetrics()
      .sort((a, b) => b.renderTime - a.renderTime)
      .slice(0, 5);

    return `
🎯 Performance Report (Score: ${score}/100)
────────────────────────────────────────
⏱️  Page Load Time: ${metrics.pageLoadTime.toFixed(0)}ms
🎨 First Contentful Paint: ${metrics.firstContentfulPaint.toFixed(0)}ms
🖼️  Largest Contentful Paint: ${metrics.largestContentfulPaint.toFixed(0)}ms
📐 Cumulative Layout Shift: ${metrics.cumulativeLayoutShift.toFixed(3)}
${metrics.memoryUsage ? `💾 Memory Usage: ${(metrics.memoryUsage / 1024 / 1024).toFixed(1)}MB` : ''}

🔧 Slowest Components:
${components.map(c => `   ${c.name}: ${c.renderTime.toFixed(1)}ms (${c.rerenderCount} renders)`).join('\n')}

${score >= 90 ? '✅ Excellent performance!' : 
  score >= 70 ? '⚠️ Good performance with room for improvement' : 
  '❌ Performance needs attention'}
    `.trim();
  }

  /**
   * Clean up observers
   */
  destroy() {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
    this.componentMetrics.clear();
  }
}

// Export singleton instance
export const performanceMonitor = new PerformanceMonitorService();

/**
 * React hook for component performance tracking
 */
export function usePerformanceTracking(componentName: string) {
  const startTime = performance.now();
  
  return {
    trackRender: () => {
      const renderTime = performance.now() - startTime;
      performanceMonitor.trackComponentRender(componentName, renderTime);
    }
  };
}

/**
 * Higher-order component for automatic performance tracking
 */
export function withPerformanceTracking<T extends object>(
  WrappedComponent: ComponentType<T>,
  componentName?: string
) {
  const displayName = componentName || WrappedComponent.displayName || WrappedComponent.name;
  
  return function PerformanceTrackedComponent(props: T) {
    const { trackRender } = usePerformanceTracking(displayName);
    
    useEffect(() => {
      trackRender();
    });
    
    return createElement(WrappedComponent, props);
  };
}