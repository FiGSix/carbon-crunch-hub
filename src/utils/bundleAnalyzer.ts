/**
 * Bundle Analysis Utilities
 * Provides tools to analyze and monitor bundle performance
 */

interface BundleAnalysis {
  totalSize: number;
  chunkSizes: { [key: string]: number };
  loadTimes: { [key: string]: number };
  optimizationScore: number;
  recommendations: string[];
}

export class BundleAnalyzer {
  private static instance: BundleAnalyzer;
  private metrics: Map<string, number> = new Map();
  private loadTimes: Map<string, number> = new Map();

  static getInstance(): BundleAnalyzer {
    if (!BundleAnalyzer.instance) {
      BundleAnalyzer.instance = new BundleAnalyzer();
    }
    return BundleAnalyzer.instance;
  }

  /**
   * Track chunk load time
   */
  trackChunkLoad(chunkName: string, loadTime: number) {
    this.loadTimes.set(chunkName, loadTime);
  }

  /**
   * Track chunk size
   */
  trackChunkSize(chunkName: string, size: number) {
    this.metrics.set(chunkName, size);
  }

  /**
   * Generate comprehensive bundle analysis
   */
  analyze(): BundleAnalysis {
    const chunkSizes = Object.fromEntries(this.metrics);
    const loadTimes = Object.fromEntries(this.loadTimes);
    const totalSize = Array.from(this.metrics.values()).reduce((sum, size) => sum + size, 0);
    
    const optimizationScore = this.calculateOptimizationScore();
    const recommendations = this.generateRecommendations();

    return {
      totalSize,
      chunkSizes,
      loadTimes,
      optimizationScore,
      recommendations
    };
  }

  /**
   * Calculate optimization score based on metrics
   */
  private calculateOptimizationScore(): number {
    const avgLoadTime = Array.from(this.loadTimes.values()).reduce((sum, time) => sum + time, 0) / this.loadTimes.size;
    const chunkCount = this.metrics.size;
    
    // Base score from load times (lower is better)
    let score = Math.max(0, 100 - (avgLoadTime / 10));
    
    // Bonus for good chunk splitting (3-8 chunks is optimal)
    if (chunkCount >= 3 && chunkCount <= 8) {
      score += 10;
    }
    
    return Math.min(100, Math.round(score));
  }

  /**
   * Generate optimization recommendations
   */
  private generateRecommendations(): string[] {
    const recommendations: string[] = [];
    const avgLoadTime = Array.from(this.loadTimes.values()).reduce((sum, time) => sum + time, 0) / this.loadTimes.size;
    
    if (avgLoadTime > 200) {
      recommendations.push('Consider further code splitting to reduce chunk sizes');
    }
    
    if (this.metrics.size < 3) {
      recommendations.push('Implement more granular code splitting');
    }
    
    if (this.metrics.size > 10) {
      recommendations.push('Consider consolidating smaller chunks');
    }
    
    const largeChunks = Array.from(this.metrics.entries()).filter(([_, size]) => size > 500000);
    if (largeChunks.length > 0) {
      recommendations.push(`Large chunks detected: ${largeChunks.map(([name]) => name).join(', ')}`);
    }
    
    return recommendations;
  }

  /**
   * Reset all metrics
   */
  reset() {
    this.metrics.clear();
    this.loadTimes.clear();
  }

  /**
   * Get current metrics summary
   */
  getSummary() {
    return {
      chunkCount: this.metrics.size,
      totalTrackedSize: Array.from(this.metrics.values()).reduce((sum, size) => sum + size, 0),
      averageLoadTime: Array.from(this.loadTimes.values()).reduce((sum, time) => sum + time, 0) / this.loadTimes.size || 0
    };
  }
}

// Export singleton instance
export const bundleAnalyzer = BundleAnalyzer.getInstance();