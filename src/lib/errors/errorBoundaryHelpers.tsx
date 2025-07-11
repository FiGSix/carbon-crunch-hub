import React from "react";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";

/**
 * Higher-order component factory for consistent error boundaries
 */
export function withStandardErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  options: {
    componentName?: string;
    fallbackMessage?: string;
    isolate?: boolean;
    showDetails?: boolean;
  } = {}
) {
  const { componentName, fallbackMessage, isolate = false, showDetails = false } = options;
  
  const WrappedComponent = (props: P) => (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        console.error(`Error in ${componentName || Component.displayName || Component.name}:`, error, errorInfo);
      }}
      isolate={isolate}
      showDetails={showDetails}
      fallback={
        !isolate ? (
          <div className="flex items-center justify-center p-8 text-center">
            <div className="space-y-2">
              <p className="text-destructive">
                {fallbackMessage || `Error loading ${componentName || Component.displayName || Component.name}`}
              </p>
              <button 
                onClick={() => window.location.reload()}
                className="text-sm text-muted-foreground hover:text-foreground underline"
              >
                Reload page
              </button>
            </div>
          </div>
        ) : undefined
      }
    >
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withStandardErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
}

/**
 * Page-level error boundary wrapper
 */
export function PageErrorBoundary({ children, pageName }: { children: React.ReactNode; pageName?: string }) {
  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        console.error(`Page Error in ${pageName}:`, error, errorInfo);
      }}
      showDetails={import.meta.env.DEV}
    >
      {children}
    </ErrorBoundary>
  );
}

/**
 * Component-level error boundary for isolated components
 */
export function ComponentErrorBoundary({ 
  children, 
  componentName,
  fallbackMessage 
}: { 
  children: React.ReactNode; 
  componentName?: string;
  fallbackMessage?: string;
}) {
  return (
    <ErrorBoundary
      isolate={true}
      onError={(error, errorInfo) => {
        console.error(`Component Error in ${componentName}:`, error, errorInfo);
      }}
      fallback={
        <div className="flex items-center justify-center p-4 text-sm text-destructive rounded-md border border-destructive/20 bg-destructive/5">
          <span>{fallbackMessage || `Error in ${componentName || 'component'}`}</span>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  );
}

/**
 * Async component error boundary for lazy-loaded components
 */
export function AsyncErrorBoundary({ children, componentName }: { children: React.ReactNode; componentName?: string }) {
  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        console.error(`Async Component Error in ${componentName}:`, error, errorInfo);
      }}
      fallback={
        <div className="flex items-center justify-center min-h-[200px] p-8 text-center">
          <div className="space-y-4">
            <div className="text-destructive">
              Failed to load {componentName || 'component'}
            </div>
            <div className="space-x-2">
              <button 
                onClick={() => window.location.reload()}
                className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
              >
                Reload Page
              </button>
            </div>
          </div>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  );
}