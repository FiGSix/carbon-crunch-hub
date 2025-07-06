import React, { Suspense, lazy, ComponentType } from 'react';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';

/**
 * Phase 2: Advanced Performance - Optimized component lazy loading
 * Includes error boundaries and performance tracking
 */

interface OptimizedLoaderProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  errorFallback?: React.ReactNode;
  timeout?: number;
}

// Enhanced loading component with better UX
const DefaultLoadingFallback = () => (
  <div className="flex items-center justify-center min-h-[200px]">
    <div className="flex flex-col items-center space-y-4">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      <p className="text-sm text-muted-foreground animate-pulse">Loading...</p>
    </div>
  </div>
);

const DefaultErrorFallback = () => (
  <div className="flex items-center justify-center min-h-[200px]">
    <div className="text-center">
      <div className="text-destructive text-lg mb-2">⚠️</div>
      <p className="text-sm text-muted-foreground">Failed to load component</p>
      <button 
        onClick={() => window.location.reload()} 
        className="mt-2 text-xs text-primary hover:underline"
      >
        Refresh page
      </button>
    </div>
  </div>
);

/**
 * Optimized component loader with error boundaries and timeout
 */
export const OptimizedLoader: React.FC<OptimizedLoaderProps> = ({
  children,
  fallback = <DefaultLoadingFallback />,
  errorFallback = <DefaultErrorFallback />,
  timeout = 10000
}) => {
  const [hasTimedOut, setHasTimedOut] = React.useState(false);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setHasTimedOut(true);
    }, timeout);

    return () => clearTimeout(timer);
  }, [timeout]);

  if (hasTimedOut) {
    return <>{errorFallback}</>;
  }

  return (
    <ErrorBoundary fallback={errorFallback}>
      <Suspense fallback={fallback}>
        {children}
      </Suspense>
    </ErrorBoundary>
  );
};

/**
 * Create an optimized lazy component with built-in error handling
 */
export function createOptimizedLazyComponent<T extends ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>,
  componentName?: string
): React.LazyExoticComponent<T> {
  const LazyComponent = lazy(async () => {
    try {
      const startTime = performance.now();
      const module = await importFunc();
      const loadTime = performance.now() - startTime;
      
      if (import.meta.env.DEV && componentName) {
        console.log(`📦 Loaded ${componentName} in ${loadTime.toFixed(1)}ms`);
      }
      
      return module;
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error(`❌ Failed to load ${componentName || 'component'}:`, error);
      }
      
      // Return a fallback component instead of throwing
      return {
        default: (() => (
          <div className="p-4 text-center text-muted-foreground">
            <p>Component failed to load</p>
            <button 
              onClick={() => window.location.reload()}
              className="mt-2 text-primary hover:underline text-sm"
            >
              Retry
            </button>
          </div>
        )) as unknown as T
      };
    }
  });

  // Set display name for debugging
  if (LazyComponent as any) {
    (LazyComponent as any).displayName = `OptimizedLazy(${componentName || 'Unknown'})`;
  }
  
  return LazyComponent;
}

/**
 * Preload a lazy component
 */
export function preloadComponent<T extends ComponentType<any>>(
  LazyComponent: React.LazyExoticComponent<T>
): void {
  // Trigger the dynamic import without rendering
  const componentImport = (LazyComponent as any)._payload?._result;
  if (!componentImport) {
    // Force load the component by accessing its internal promise
    try {
      (LazyComponent as any)._init();
    } catch {
      // Expected to fail, but triggers the import
    }
  }
}

/**
 * Higher-order component for route-level code splitting
 */
export function withOptimizedRouteLoading<T extends object>(
  LazyComponent: React.LazyExoticComponent<ComponentType<T>>,
  routeName?: string
) {
  return function OptimizedRoute(props: T) {
    return (
      <OptimizedLoader
        fallback={
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading {routeName || 'page'}...</p>
            </div>
          </div>
        }
        errorFallback={
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center max-w-md">
              <h2 className="text-xl font-semibold text-destructive mb-2">Page failed to load</h2>
              <p className="text-muted-foreground mb-4">
                There was an error loading {routeName || 'this page'}.
              </p>
              <button 
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
              >
                Reload Page
              </button>
            </div>
          </div>
        }
      >
        <LazyComponent {...(props as any)} />
      </OptimizedLoader>
    );
  };
}