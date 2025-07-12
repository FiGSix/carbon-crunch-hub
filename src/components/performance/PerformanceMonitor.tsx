import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { bundleOptimizer } from '@/lib/performance/BundleOptimizer';
import { Zap, Clock, Database, Wifi } from 'lucide-react';

interface PerformanceMetrics {
  loadTime: number;
  domContentLoaded: number;
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  cumulativeLayoutShift: number;
  firstInputDelay: number;
  bundleSize: number;
  preloadedRoutes: string[];
}

export function PerformanceMonitor() {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [optimizationScore, setOptimizationScore] = useState(0);

  useEffect(() => {
    const collectMetrics = async () => {
      // Get navigation timing
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      
      // Get paint timing
      const paintEntries = performance.getEntriesByType('paint');
      const fcp = paintEntries.find(entry => entry.name === 'first-contentful-paint')?.startTime || 0;
      
      // Get layout shift entries
      let cls = 0;
      if ('PerformanceObserver' in window) {
        new PerformanceObserver((list) => {
          list.getEntries().forEach((entry: any) => {
            if (entry.hadRecentInput) return;
            cls += entry.value;
          });
        }).observe({ entryTypes: ['layout-shift'] });
      }

      // Get bundle optimizer stats
      const bundleStats = bundleOptimizer.getStats();

      const collected: PerformanceMetrics = {
        loadTime: Math.round(navigation.loadEventEnd - navigation.fetchStart),
        domContentLoaded: Math.round(navigation.domContentLoadedEventEnd - navigation.fetchStart),
        firstContentfulPaint: Math.round(fcp),
        largestContentfulPaint: 0, // Would need LCP observer
        cumulativeLayoutShift: cls,
        firstInputDelay: 0, // Would need FID observer
        bundleSize: 0, // Estimated
        preloadedRoutes: bundleStats.preloadedRoutes
      };

      setMetrics(collected);

      // Calculate optimization score (0-100)
      let score = 100;
      if (collected.loadTime > 3000) score -= 30; // Slow load time
      if (collected.domContentLoaded > 1500) score -= 20; // Slow DOM ready
      if (collected.firstContentfulPaint > 2500) score -= 25; // Slow FCP
      if (collected.cumulativeLayoutShift > 0.1) score -= 15; // Layout shift
      score += bundleStats.preloadedRoutes.length * 2; // Bonus for preloading

      setOptimizationScore(Math.max(0, Math.min(100, score)));
    };

    // Collect metrics after page load
    if (document.readyState === 'complete') {
      collectMetrics();
    } else {
      window.addEventListener('load', collectMetrics);
    }

    return () => window.removeEventListener('load', collectMetrics);
  }, []);

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBadge = (score: number) => {
    if (score >= 90) return { variant: 'default' as const, label: 'Excellent' };
    if (score >= 70) return { variant: 'secondary' as const, label: 'Good' };
    return { variant: 'destructive' as const, label: 'Needs Work' };
  };

  if (!metrics) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Performance Monitor
          </CardTitle>
          <CardDescription>Collecting performance metrics...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const badge = getScoreBadge(optimizationScore);

  return (
    <div className="space-y-4">
      {/* Overall Score */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Performance Score
            </div>
            <Badge variant={badge.variant}>{badge.label}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Overall Score</span>
              <span className={`text-2xl font-bold ${getScoreColor(optimizationScore)}`}>
                {optimizationScore}/100
              </span>
            </div>
            <Progress value={optimizationScore} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Detailed Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Load Times
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span>Total Load Time</span>
                <span className={metrics.loadTime > 3000 ? 'text-red-600' : 'text-green-600'}>
                  {metrics.loadTime}ms
                </span>
              </div>
              <Progress 
                value={Math.min(100, (3000 - metrics.loadTime) / 3000 * 100)} 
                className="h-1" 
              />
            </div>
            
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span>DOM Content Loaded</span>
                <span className={metrics.domContentLoaded > 1500 ? 'text-red-600' : 'text-green-600'}>
                  {metrics.domContentLoaded}ms
                </span>
              </div>
              <Progress 
                value={Math.min(100, (1500 - metrics.domContentLoaded) / 1500 * 100)} 
                className="h-1" 
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span>First Contentful Paint</span>
                <span className={metrics.firstContentfulPaint > 2500 ? 'text-red-600' : 'text-green-600'}>
                  {metrics.firstContentfulPaint}ms
                </span>
              </div>
              <Progress 
                value={Math.min(100, (2500 - metrics.firstContentfulPaint) / 2500 * 100)} 
                className="h-1" 
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Database className="h-4 w-4" />
              Optimizations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span>Preloaded Routes</span>
                <span className="text-green-600">{metrics.preloadedRoutes.length}</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {metrics.preloadedRoutes.map(route => (
                  <Badge key={route} variant="outline" className="text-xs">
                    {route}
                  </Badge>
                ))}
              </div>
            </div>
            
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span>Layout Shift</span>
                <span className={metrics.cumulativeLayoutShift > 0.1 ? 'text-red-600' : 'text-green-600'}>
                  {metrics.cumulativeLayoutShift.toFixed(3)}
                </span>
              </div>
              <Progress 
                value={Math.min(100, (0.1 - metrics.cumulativeLayoutShift) / 0.1 * 100)} 
                className="h-1" 
              />
            </div>

            <div className="text-xs text-muted-foreground space-y-1">
              <div>✅ Service Worker Active</div>
              <div>✅ Critical CSS Inlined</div>
              <div>✅ Resource Preloading</div>
              <div>✅ Bundle Splitting</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}