
/**
 * Performance monitoring and analysis tool
 * Tracks application performance metrics and identifies bottlenecks
 */

interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: number;
  category: string;
}

interface PerformanceReport {
  overallScore: number;
  metrics: PerformanceMetric[];
  recommendations: string[];
  issues: string[];
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private observer?: PerformanceObserver;
  
  startMonitoring(): void {
    console.log('🔍 Starting performance monitoring...');
    
    // Monitor various performance entries
    if ('PerformanceObserver' in window) {
      this.observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.recordMetric(entry.name, entry.duration, 'ms', 'Navigation');
        }
      });
      
      try {
        this.observer.observe({ entryTypes: ['navigation', 'resource', 'paint'] });
      } catch (e) {
        console.warn('Performance observer not fully supported');
      }
    }
    
    // Record initial metrics
    this.recordInitialMetrics();
  }
  
  private recordInitialMetrics(): void {
    // Navigation timing
    if (performance.timing) {
      const timing = performance.timing;
      const navigationStart = timing.navigationStart;
      
      this.addMetric('DOM Content Loaded', timing.domContentLoadedEventEnd - navigationStart, 'ms', 'Loading');
      this.addMetric('Page Load Complete', timing.loadEventEnd - navigationStart, 'ms', 'Loading');
      this.addMetric('DNS Lookup', timing.domainLookupEnd - timing.domainLookupStart, 'ms', 'Network');
      this.addMetric('Server Response', timing.responseEnd - timing.requestStart, 'ms', 'Network');
    }
    
    // Memory usage (if available)
    if ((performance as any).memory) {
      const memory = (performance as any).memory;
      this.addMetric('JS Heap Used', memory.usedJSHeapSize / 1024 / 1024, 'MB', 'Memory');
      this.addMetric('JS Heap Total', memory.totalJSHeapSize / 1024 / 1024, 'MB', 'Memory');
      this.addMetric('JS Heap Limit', memory.jsHeapSizeLimit / 1024 / 1024, 'MB', 'Memory');
    }
    
    // Paint metrics
    if (performance.getEntriesByType) {
      const paintEntries = performance.getEntriesByType('paint');
      paintEntries.forEach(entry => {
        this.addMetric(entry.name, entry.startTime, 'ms', 'Rendering');
      });
    }
  }
  
  private addMetric(name: string, value: number, unit: string, category: string): void {
    this.metrics.push({
      name,
      value,
      unit,
      timestamp: Date.now(),
      category
    });
  }
  
  private recordMetric(name: string, value: number, unit: string, category: string): void {
    this.addMetric(name, value, unit, category);
  }
  
  // Test specific performance scenarios
  async testCalculationPerformance(): Promise<void> {
    console.log('⚡ Testing calculation performance...');
    
    const { UnifiedCarbonService } = await import('@/services/calculations/UnifiedCarbonService');
    
    // Test single calculation performance
    const singleStart = performance.now();
    await UnifiedCarbonService.calculateComplete({
      sizeKwp: 100,
      commissionDate: '2024-01-01'
    });
    const singleDuration = performance.now() - singleStart;
    this.addMetric('Single Calculation', singleDuration, 'ms', 'Calculations');
    
    // Test batch calculation performance
    const batchStart = performance.now();
    const promises = [];
    for (let i = 0; i < 10; i++) {
      promises.push(UnifiedCarbonService.calculateComplete({
        sizeKwp: 100 + (i * 10),
        commissionDate: '2024-01-01'
      }));
    }
    await Promise.all(promises);
    const batchDuration = performance.now() - batchStart;
    this.addMetric('Batch Calculations (10)', batchDuration, 'ms', 'Calculations');
    
    // Test cache performance
    const cacheStart = performance.now();
    for (let i = 0; i < 100; i++) {
      UnifiedCarbonService.calculateAnnualEnergy(100);
    }
    const cacheDuration = performance.now() - cacheStart;
    this.addMetric('Cached Calculations (100)', cacheDuration, 'ms', 'Cache');
  }
  
  async testDataLoadingPerformance(): Promise<void> {
    console.log('📊 Testing data loading performance...');
    
    // This would test actual data loading in a real scenario
    // For now, we'll simulate the test
    const loadStart = performance.now();
    
    // Simulate data loading delay
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const loadDuration = performance.now() - loadStart;
    this.addMetric('Data Loading Simulation', loadDuration, 'ms', 'Data Loading');
  }
  
  async testRenderingPerformance(): Promise<void> {
    console.log('🎨 Testing rendering performance...');
    
    // Test DOM manipulation performance
    const renderStart = performance.now();
    
    // Create and manipulate DOM elements
    const container = document.createElement('div');
    for (let i = 0; i < 1000; i++) {
      const element = document.createElement('span');
      element.textContent = `Item ${i}`;
      container.appendChild(element);
    }
    
    // Remove elements
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }
    
    const renderDuration = performance.now() - renderStart;
    this.addMetric('DOM Manipulation (1000 elements)', renderDuration, 'ms', 'Rendering');
  }
  
  generateReport(): PerformanceReport {
    const issues: string[] = [];
    const recommendations: string[] = [];
    let overallScore = 100;
    
    // Analyze metrics for issues
    this.metrics.forEach(metric => {
      switch (metric.category) {
        case 'Loading':
          if (metric.value > 3000) { // 3 seconds
            issues.push(`Slow ${metric.name}: ${metric.value.toFixed(2)}${metric.unit}`);
            recommendations.push(`Optimize ${metric.name} - target under 3 seconds`);
            overallScore -= 10;
          }
          break;
          
        case 'Memory':
          if (metric.name === 'JS Heap Used' && metric.value > 50) { // 50MB
            issues.push(`High memory usage: ${metric.value.toFixed(2)}${metric.unit}`);
            recommendations.push('Consider memory optimization techniques');
            overallScore -= 5;
          }
          break;
          
        case 'Calculations':
          if (metric.value > 1000) { // 1 second
            issues.push(`Slow calculation: ${metric.name} took ${metric.value.toFixed(2)}${metric.unit}`);
            recommendations.push('Consider caching or optimization for calculations');
            overallScore -= 5;
          }
          break;
          
        case 'Rendering':
          if (metric.name.includes('first-contentful-paint') && metric.value > 2000) {
            issues.push(`Slow first paint: ${metric.value.toFixed(2)}${metric.unit}`);
            recommendations.push('Optimize initial rendering and reduce bundle size');
            overallScore -= 15;
          }
          break;
      }
    });
    
    // Add general recommendations
    if (issues.length === 0) {
      recommendations.push('Performance looks good! Consider regular monitoring.');
    }
    
    return {
      overallScore: Math.max(0, overallScore),
      metrics: this.metrics,
      recommendations,
      issues
    };
  }
  
  stopMonitoring(): void {
    if (this.observer) {
      this.observer.disconnect();
    }
    console.log('🛑 Performance monitoring stopped');
  }
  
  printReport(): void {
    const report = this.generateReport();
    
    console.log(`
🎯 PERFORMANCE REPORT
═══════════════════
Overall Score: ${report.overallScore}/100

📊 METRICS BY CATEGORY
`);
    
    const categories = [...new Set(this.metrics.map(m => m.category))];
    categories.forEach(category => {
      console.log(`\n${category}:`);
      const categoryMetrics = this.metrics.filter(m => m.category === category);
      categoryMetrics.forEach(metric => {
        console.log(`  ${metric.name}: ${metric.value.toFixed(2)}${metric.unit}`);
      });
    });
    
    if (report.issues.length > 0) {
      console.log(`\n⚠️ ISSUES FOUND:`);
      report.issues.forEach(issue => console.log(`  • ${issue}`));
    }
    
    if (report.recommendations.length > 0) {
      console.log(`\n💡 RECOMMENDATIONS:`);
      report.recommendations.forEach(rec => console.log(`  • ${rec}`));
    }
  }
}

export const performanceMonitor = new PerformanceMonitor();
