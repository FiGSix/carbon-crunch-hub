import React, { Component, ReactNode } from 'react';
import { QueryErrorResetBoundary } from '@tanstack/react-query';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { RefreshCw, AlertTriangle } from 'lucide-react';
import { logger } from '@/lib/logger';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  showDetails?: boolean;
}

interface State {
  hasError: boolean;
  error?: Error;
}

/**
 * Error boundary specifically designed for React Query errors
 * Provides retry functionality and proper error reporting
 */
class QueryErrorBoundaryComponent extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    logger.withContext({ 
      component: 'QueryErrorBoundary',
      feature: 'error-boundary' 
    }).error('Query error boundary caught error', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    });
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex items-center justify-center min-h-[200px] p-6">
          <Alert className="max-w-md">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Something went wrong</AlertTitle>
            <AlertDescription className="mt-2 space-y-2">
              <p>
                We encountered an error while loading your data. This might be a temporary issue.
              </p>
              {this.props.showDetails && this.state.error && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-sm text-muted-foreground">
                    Technical details
                  </summary>
                  <pre className="mt-1 text-xs bg-muted p-2 rounded whitespace-pre-wrap">
                    {this.state.error.message}
                  </pre>
                </details>
              )}
            </AlertDescription>
          </Alert>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Combined Query Error Boundary with React Query reset functionality
 */
export function QueryErrorBoundary({ children, fallback, showDetails = false }: Props) {
  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <QueryErrorBoundaryComponent 
          fallback={
            fallback || (
              <div className="flex items-center justify-center min-h-[200px] p-6">
                <Alert className="max-w-md">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Unable to load data</AlertTitle>
                  <AlertDescription className="mt-2 space-y-3">
                    <p>
                      We're having trouble loading your data. Please try again.
                    </p>
                    <Button 
                      onClick={reset} 
                      variant="outline" 
                      size="sm"
                      className="w-full"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Try again
                    </Button>
                  </AlertDescription>
                </Alert>
              </div>
            )
          }
          showDetails={showDetails}
        >
          {children}
        </QueryErrorBoundaryComponent>
      )}
    </QueryErrorResetBoundary>
  );
}

/**
 * Inline error component for query errors
 */
export function QueryErrorFallback({ 
  error, 
  resetErrorBoundary,
  title = "Failed to load data",
  showRetry = true,
}: {
  error: Error;
  resetErrorBoundary: () => void;
  title?: string;
  showRetry?: boolean;
}) {
  return (
    <Alert className="m-4">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription className="mt-2 space-y-2">
        <p>{error.message || 'An unexpected error occurred.'}</p>
        {showRetry && (
          <Button 
            onClick={resetErrorBoundary} 
            variant="outline" 
            size="sm"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}