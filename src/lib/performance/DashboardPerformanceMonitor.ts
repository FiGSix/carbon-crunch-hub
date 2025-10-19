/**
 * Phase 7: Dashboard-specific Performance Monitoring
 * Tracks metrics for dashboard data loading, rendering, and user interactions
 */

import { performanceMonitor } from './PerformanceMonitor';
import { logger } from '@/lib/logger';

export interface DashboardPerformanceMetrics {
  dataFetchTime: number;
  renderTime: number;
  totalLoadTime: number;
  metricsCalculationTime: number;
  componentCount: number;
  queryCount: number;
  timestamp: number;
}

class DashboardPerformanceMonitor {
  private metrics: DashboardPerformanceMetrics[] = [];
  private currentSession: Partial<DashboardPerformanceMetrics> = {};
  
  /**
   * Start tracking data fetch performance
   */
  startDataFetch(queryName: string): () => void {
    const startTime = performance.now();
    
    return () => {
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      logger.info(`[Dashboard Performance] ${queryName} fetch completed`, {
        duration: `${duration.toFixed(2)}ms`,
        timestamp: new Date().toISOString()
      });
      
      this.currentSession.dataFetchTime = 
        (this.currentSession.dataFetchTime || 0) + duration;
      this.currentSession.queryCount = 
        (this.currentSession.queryCount || 0) + 1;
    };
  }

  /**
   * Start tracking component render performance
   */
  startRender(componentName: string): () => void {
    const startTime = performance.now();
    
    return () => {
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      performanceMonitor.trackComponentRender(componentName, duration);
      
      this.currentSession.renderTime = 
        (this.currentSession.renderTime || 0) + duration;
      this.currentSession.componentCount = 
        (this.currentSession.componentCount || 0) + 1;
    };
  }

  /**
   * Track metrics calculation performance
   */
  trackMetricsCalculation(duration: number): void {
    this.currentSession.metricsCalculationTime = duration;
    
    logger.info('[Dashboard Performance] Metrics calculation', {
      duration: `${duration.toFixed(2)}ms`
    });
  }

  /**
   * Complete the current performance session
   */
  completeSession(): DashboardPerformanceMetrics {
    const totalLoadTime = 
      (this.currentSession.dataFetchTime || 0) +
      (this.currentSession.renderTime || 0) +
      (this.currentSession.metricsCalculationTime || 0);

    const sessionMetrics: DashboardPerformanceMetrics = {
      dataFetchTime: this.currentSession.dataFetchTime || 0,
      renderTime: this.currentSession.renderTime || 0,
      metricsCalculationTime: this.currentSession.metricsCalculationTime || 0,
      totalLoadTime,
      componentCount: this.currentSession.componentCount || 0,
      queryCount: this.currentSession.queryCount || 0,
      timestamp: Date.now()
    };

    this.metrics.push(sessionMetrics);
    this.currentSession = {};

    // Keep only last 50 sessions
    if (this.metrics.length > 50) {
      this.metrics = this.metrics.slice(-50);
    }

    return sessionMetrics;
  }

  /**
   * Get performance statistics
   */
  getStats() {
    if (this.metrics.length === 0) {
      return null;
    }

    const calculateAverage = (key: keyof DashboardPerformanceMetrics) => {
      const sum = this.metrics.reduce((acc, m) => acc + (m[key] as number), 0);
      return sum / this.metrics.length;
    };

    const calculateP95 = (key: keyof DashboardPerformanceMetrics) => {
      const sorted = [...this.metrics]
        .map(m => m[key] as number)
        .sort((a, b) => a - b);
      const index = Math.floor(sorted.length * 0.95);
      return sorted[index];
    };

    return {
      averages: {
        dataFetchTime: calculateAverage('dataFetchTime'),
        renderTime: calculateAverage('renderTime'),
        totalLoadTime: calculateAverage('totalLoadTime'),
        metricsCalculationTime: calculateAverage('metricsCalculationTime')
      },
      p95: {
        dataFetchTime: calculateP95('dataFetchTime'),
        renderTime: calculateP95('renderTime'),
        totalLoadTime: calculateP95('totalLoadTime')
      },
      sessionCount: this.metrics.length,
      lastSession: this.metrics[this.metrics.length - 1]
    };
  }

  /**
   * Generate performance report
   */
  generateReport(): string {
    const stats = this.getStats();
    
    if (!stats) {
      return 'No performance data collected yet';
    }

    const formatTime = (ms: number) => `${ms.toFixed(2)}ms`;

    return `
Dashboard Performance Report
============================

Session Count: ${stats.sessionCount}

Average Metrics:
- Data Fetch: ${formatTime(stats.averages.dataFetchTime)}
- Render Time: ${formatTime(stats.averages.renderTime)}
- Calculations: ${formatTime(stats.averages.metricsCalculationTime)}
- Total Load: ${formatTime(stats.averages.totalLoadTime)}

P95 Metrics:
- Data Fetch: ${formatTime(stats.p95.dataFetchTime)}
- Render Time: ${formatTime(stats.p95.renderTime)}
- Total Load: ${formatTime(stats.p95.totalLoadTime)}

Last Session:
- Total Load: ${formatTime(stats.lastSession.totalLoadTime)}
- Components: ${stats.lastSession.componentCount}
- Queries: ${stats.lastSession.queryCount}

Performance Score: ${this.calculateScore(stats)}/100
    `.trim();
  }

  /**
   * Calculate overall performance score
   */
  private calculateScore(stats: ReturnType<typeof this.getStats>): number {
    if (!stats) return 0;

    let score = 100;

    // Deduct points for slow data fetches
    if (stats.averages.dataFetchTime > 1000) score -= 30;
    else if (stats.averages.dataFetchTime > 500) score -= 15;

    // Deduct points for slow renders
    if (stats.averages.renderTime > 500) score -= 20;
    else if (stats.averages.renderTime > 200) score -= 10;

    // Deduct points for slow total load
    if (stats.averages.totalLoadTime > 2000) score -= 30;
    else if (stats.averages.totalLoadTime > 1000) score -= 15;

    // Deduct points for high P95 variance
    const variance = stats.p95.totalLoadTime - stats.averages.totalLoadTime;
    if (variance > 1000) score -= 20;

    return Math.max(0, score);
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    this.metrics = [];
    this.currentSession = {};
  }
}

export const dashboardPerformanceMonitor = new DashboardPerformanceMonitor();

// Add global command for debugging
if (typeof window !== 'undefined' && import.meta.env.DEV) {
  (window as any).dashboardPerformance = () => {
    console.log(dashboardPerformanceMonitor.generateReport());
  };
}
