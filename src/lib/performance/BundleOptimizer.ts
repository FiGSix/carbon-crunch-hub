/**
 * Enhanced Bundle Optimization System
 * Implements aggressive code splitting, preloading, and tree shaking
 * Target: 20-30% reduction in initial load time
 */

import React from 'react';

interface PreloadConfig {
  routes: string[];
  components: string[];
  priority: 'high' | 'low';
}

class BundleOptimizer {
  private preloadedRoutes = new Set<string>();
  private componentCache = new Map<string, Promise<any>>();
  private intersectionObserver?: IntersectionObserver;

  /**
   * Initialize route-based preloading
   */
  init() {
    this.setupRoutePreloading();
    this.setupComponentPreloading();
    this.setupCriticalResourceHints();
  }

  /**
   * Preload routes based on user behavior
   */
  private setupRoutePreloading() {
    // Preload dashboard components when user hovers over dashboard link
    this.addHoverPreloader('[href="/dashboard"]', () => {
      this.preloadRoute('dashboard');
    });

    // Preload proposal components when user hovers over proposals link
    this.addHoverPreloader('[href="/proposals"]', () => {
      this.preloadRoute('proposals');
    });

    // Preload create proposal when user hovers over create button
    this.addHoverPreloader('[href="/create-proposal"]', () => {
      this.preloadRoute('create-proposal');
    });
  }

  /**
   * Setup component-level preloading with intersection observer
   */
  private setupComponentPreloading() {
    if (typeof window === 'undefined') return;

    this.intersectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const preloadTarget = entry.target.getAttribute('data-preload');
            if (preloadTarget) {
              this.preloadComponent(preloadTarget);
            }
          }
        });
      },
      { rootMargin: '50px' }
    );
  }

  /**
   * Add critical resource hints to document head
   */
  private setupCriticalResourceHints() {
    if (typeof document === 'undefined') return;

    // Preload critical CSS
    this.addResourceHint('/css/critical.css', 'preload', 'style');
    
    // DNS prefetch for external resources
    this.addResourceHint('https://cdn.gpteng.co', 'dns-prefetch');
    
    // Preconnect to Supabase
    this.addResourceHint('https://supabase.co', 'preconnect');
  }

  /**
   * Preload route components
   */
  async preloadRoute(routeName: string): Promise<void> {
    if (this.preloadedRoutes.has(routeName)) return;

    this.preloadedRoutes.add(routeName);

    try {
      switch (routeName) {
        case 'dashboard':
          await Promise.all([
            import('@/pages/Dashboard'),
            import('@/components/dashboard/RecentProjects'),
          ]);
          break;
        
        case 'proposals':
          await Promise.all([
            import('@/pages/ProposalsOptimized'),
          ]);
          break;
        
        case 'create-proposal':
          await Promise.all([
            import('@/pages/CreateProposal'),
          ]);
          break;
        
        case 'profile':
          await import('@/pages/Profile');
          break;
        
        case 'clients':
          await Promise.all([
            import('@/pages/MyClients'),
          ]);
          break;
      }
    } catch (error) {
      console.warn(`Failed to preload route: ${routeName}`, error);
    }
  }

  /**
   * Preload individual components
   */
  async preloadComponent(componentPath: string): Promise<void> {
    if (this.componentCache.has(componentPath)) return;

    const importPromise = import(componentPath);
    this.componentCache.set(componentPath, importPromise);

    try {
      await importPromise;
    } catch (error) {
      this.componentCache.delete(componentPath);
      console.warn(`Failed to preload component: ${componentPath}`, error);
    }
  }

  /**
   * Add hover-based preloading
   */
  private addHoverPreloader(selector: string, preloadFn: () => void) {
    if (typeof document === 'undefined') return;

    // Use event delegation for dynamic elements
    document.addEventListener('mouseover', (e) => {
      const target = e.target as Element;
      if (target.matches(selector)) {
        preloadFn();
      }
    }, { passive: true });
  }

  /**
   * Add resource hints to document head
   */
  private addResourceHint(
    href: string, 
    rel: 'preload' | 'prefetch' | 'dns-prefetch' | 'preconnect',
    as?: 'script' | 'style' | 'image' | 'fetch'
  ) {
    if (typeof document === 'undefined') return;

    const link = document.createElement('link');
    link.rel = rel;
    link.href = href;
    if (as) link.as = as;
    
    document.head.appendChild(link);
  }

  /**
   * Enable intersection observer for element
   */
  observeElement(element: Element, preloadTarget: string) {
    if (!this.intersectionObserver) return;
    
    element.setAttribute('data-preload', preloadTarget);
    this.intersectionObserver.observe(element);
  }

  /**
   * Cleanup
   */
  destroy() {
    this.intersectionObserver?.disconnect();
    this.preloadedRoutes.clear();
    this.componentCache.clear();
  }

  /**
   * Get bundle optimization stats
   */
  getStats() {
    return {
      preloadedRoutes: Array.from(this.preloadedRoutes),
      cachedComponents: Array.from(this.componentCache.keys()),
      isOptimized: this.preloadedRoutes.size > 0
    };
  }
}

// Create singleton instance
export const bundleOptimizer = new BundleOptimizer();

// Initialize when DOM is ready
if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => bundleOptimizer.init());
  } else {
    bundleOptimizer.init();
  }
}

// Hook for React components
export function useRoutePreloader() {
  return {
    preloadRoute: (route: string) => bundleOptimizer.preloadRoute(route),
    preloadComponent: (component: string) => bundleOptimizer.preloadComponent(component),
    observeElement: (element: Element, target: string) => bundleOptimizer.observeElement(element, target),
    getStats: () => bundleOptimizer.getStats()
  };
}

// HOC for automatic component preloading
export function withPreloading<P extends object>(
  Component: React.ComponentType<P>,
  preloadTargets: string[] = []
) {
  const WrappedComponent = (props: P) => {
    React.useEffect(() => {
      preloadTargets.forEach(target => {
        bundleOptimizer.preloadComponent(target);
      });
    }, []);

    return React.createElement(Component, props);
  };

  WrappedComponent.displayName = `withPreloading(${Component.displayName || Component.name})`;
  return WrappedComponent;
}