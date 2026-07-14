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

// Detect a dynamic-import / chunk load failure (stale bundle after deploy)
function isChunkLoadError(error: unknown): boolean {
  if (!error) return false;
  const err = error as { name?: string; message?: string };
  const name = err.name || '';
  const message = err.message || '';
  return (
    name === 'ChunkLoadError' ||
    /Loading chunk [\d]+ failed/i.test(message) ||
    /Failed to fetch dynamically imported module/i.test(message) ||
    /Importing a module script failed/i.test(message) ||
    /error loading dynamically imported module/i.test(message) ||
    /dynamically imported module/i.test(message)
  );
}

// Reload with a cache-busting query param so the CDN/browser fetches
// a fresh index.html (which references current chunk hashes).
async function hardReloadWithCacheBust(): Promise<void> {
  try {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister().catch(() => undefined)));
    }
    if (typeof caches !== 'undefined') {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k).catch(() => undefined)));
    }
  } catch {
    // best-effort
  }
  const { pathname, search, hash } = window.location;
  const sep = search ? '&' : '?';
  const busted = `${pathname}${search}${sep}v=${Date.now()}${hash}`;
  window.location.replace(busted);
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
      <p className="text-sm text-muted-foreground">The app was updated. Reloading the latest version...</p>
      <button
        onClick={() => { void hardReloadWithCacheBust(); }}
        className="mt-2 text-xs text-primary hover:underline"
      >
        Reload now
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
 * Create an optimized lazy component with built-in error handling.
 * On a chunk-load failure (stale bundle after deploy), auto-recover ONCE
 * with a cache-busting hard reload; if that already happened this session,
 * render a manual reload UI to avoid an infinite loop.
 */
export function createOptimizedLazyComponent<T extends ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>,
  componentName?: string
): React.LazyExoticComponent<T> {
  const reloadFlagKey = `chunk-reload:${componentName || 'unknown'}`;

  const LazyComponent = lazy(async () => {
    try {
      const startTime = performance.now();
      const module = await importFunc();
      const loadTime = performance.now() - startTime;

      if (import.meta.env.DEV && componentName) {
        console.log(`📦 Loaded ${componentName} in ${loadTime.toFixed(1)}ms`);
      }

      // Successful load — clear the retry flag so a future stale-cache event can auto-recover again
      try { sessionStorage.removeItem(reloadFlagKey); } catch { /* ignore */ }

      return module;
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error(`❌ Failed to load ${componentName || 'component'}:`, error);
      }

      // Auto-recover from stale chunk errors exactly once per session per component
      if (isChunkLoadError(error)) {
        let alreadyReloaded = false;
        try { alreadyReloaded = sessionStorage.getItem(reloadFlagKey) === '1'; } catch { /* ignore */ }

        if (!alreadyReloaded) {
          try { sessionStorage.setItem(reloadFlagKey, '1'); } catch { /* ignore */ }
          // Fire-and-forget; the page will navigate away
          void hardReloadWithCacheBust();
          // Return a minimal placeholder while the reload happens
          return {
            default: (() => (
              <div className="flex items-center justify-center min-h-[200px]">
                <div className="flex flex-col items-center space-y-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  <p className="text-sm text-muted-foreground">Updating to the latest version...</p>
                </div>
              </div>
            )) as unknown as T
          };
        }
      }

      // Fallback UI with a real cache-busting reload
      return {
        default: (() => (
          <div className="p-4 text-center text-muted-foreground">
            <p>The app was updated. Reload to get the latest version.</p>
            <button
              onClick={() => { void hardReloadWithCacheBust(); }}
              className="mt-2 text-primary hover:underline text-sm"
            >
              Reload now
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
              <h2 className="text-xl font-semibold text-destructive mb-2">Updating to the latest version</h2>
              <p className="text-muted-foreground mb-4">
                {routeName ? `${routeName} was updated.` : 'This page was updated.'} Reload to continue.
              </p>
              <button
                onClick={() => { void hardReloadWithCacheBust(); }}
                className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
              >
                Reload now
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
