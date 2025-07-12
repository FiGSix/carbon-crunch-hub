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
  <div className="flex items-center justify-center min-h-[200px] p-8">
    <div className="text-center space-y-4">
      <div className="w-16 h-16 mx-auto bg-destructive/10 rounded-full flex items-center justify-center">
        <svg className="w-8 h-8 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      </div>
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-2">Component Error</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Unable to load this component. This might be a temporary issue.
        </p>
      </div>
      <div className="flex gap-2 justify-center">
        <button 
          onClick={() => window.location.reload()} 
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
        >
          Refresh Page
        </button>
        <button 
          onClick={() => window.history.back()} 
          className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/90 transition-colors"
        >
          Go Back
        </button>
      </div>
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