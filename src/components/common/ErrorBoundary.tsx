
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';
import { logger } from '@/lib/logger';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  showDetails?: boolean;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  errorId: string;
  retryCount: number;
}

/**
 * Production-ready error boundary with logging and recovery options
 */
export class ErrorBoundary extends Component<Props, State> {
  private maxRetries = 3;
  
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      errorId: '',
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      errorId: `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const errorDetails = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      errorId: this.state.errorId,
      retryCount: this.state.retryCount,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    // Log error using our logger
    logger.error('Error Boundary Caught Error', errorDetails);

    // Update state with error details
    this.setState({
      error,
      errorInfo
    });

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);

    // Report to external service in production
    if (process.env.NODE_ENV === 'production') {
      this.reportError(errorDetails);
    }
  }

  private reportError = (errorDetails: any) => {
    // In a real app, you'd send this to your error tracking service
    console.error('Reporting error to external service:', errorDetails);
  };

  handleRetry = () => {
    if (this.state.retryCount < this.maxRetries) {
      this.setState(prevState => ({ 
        hasError: false,
        error: undefined,
        errorInfo: undefined,
        retryCount: prevState.retryCount + 1
      }));
    }
  };

  handleRefresh = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const canRetry = this.state.retryCount < this.maxRetries;
      const showDetails = this.props.showDetails || process.env.NODE_ENV === 'development';

      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
          <div className="max-w-md w-full">
            <Alert variant="destructive" className="mb-6">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Something went wrong</AlertTitle>
              <AlertDescription className="mt-2 space-y-2">
                <p>
                  An unexpected error occurred. We've logged this issue and will work to fix it.
                </p>
                
                {showDetails && this.state.error && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-sm font-medium">
                      <Bug className="inline h-3 w-3 mr-1" />
                      Error Details
                    </summary>
                    <div className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto max-h-32">
                      <div className="font-mono break-all">
                        <strong>Error:</strong> {this.state.error.message}
                      </div>
                      {this.state.error.stack && (
                        <div className="mt-1 font-mono text-gray-600">
                          <strong>Stack:</strong>
                          <pre className="whitespace-pre-wrap text-xs">
                            {this.state.error.stack.split('\n').slice(0, 5).join('\n')}
                          </pre>
                        </div>
                      )}
                    </div>
                  </details>
                )}
                
                <p className="text-xs text-gray-500">
                  Error ID: {this.state.errorId}
                  {this.state.retryCount > 0 && ` (Retry ${this.state.retryCount}/${this.maxRetries})`}
                </p>
              </AlertDescription>
            </Alert>

            <div className="flex flex-col gap-3">
              {canRetry && (
                <Button onClick={this.handleRetry} className="w-full">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Try Again {this.state.retryCount > 0 && `(${this.maxRetries - this.state.retryCount} attempts left)`}
                </Button>
              )}
              
              <div className="flex gap-3">
                <Button 
                  onClick={this.handleRefresh}
                  variant="outline"
                  className="flex-1"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh Page
                </Button>
                
                <Button 
                  onClick={this.handleGoHome}
                  variant="outline"
                  className="flex-1"
                >
                  <Home className="mr-2 h-4 w-4" />
                  Go Home
                </Button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
