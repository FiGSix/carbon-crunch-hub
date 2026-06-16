import { Component, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { devLogger } from '@/lib/performance/ConsoleReplacementUtility';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  pageName?: string;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorId: string;
}

/**
 * Generic page-level error boundary
 * Provides graceful error handling for entire pages
 */
export class PageErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { 
      hasError: false,
      errorId: Date.now().toString()
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
      errorId: Date.now().toString()
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error to console for immediate debugging
    console.error('🚨 Page Error Boundary caught an error:', {
      pageName: this.props.pageName,
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack
    });
    
    // Log error
    devLogger.general.error('Page Error Boundary caught an error:', {
      pageName: this.props.pageName,
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack
    });

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);

    // Report to error tracking service
    try {
      devLogger.general.error('[Error Boundary]', {
        page: this.props.pageName,
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
    } catch (reportingError) {
      devLogger.general.error('Failed to report error:', reportingError);
    }
  }

  handleReset = () => {
    this.setState({ 
      hasError: false, 
      error: undefined,
      errorId: Date.now().toString()
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-background">
          <div className="max-w-md w-full text-center space-y-6">
            <div className="flex justify-center">
              <AlertTriangle className="h-16 w-16 text-destructive" />
            </div>
            
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-foreground">
                Something went wrong
              </h1>
              <p className="text-muted-foreground">
                {this.props.pageName 
                  ? `We encountered an error loading the ${this.props.pageName} page.`
                  : 'We encountered an unexpected error.'
                }
              </p>
            </div>

            {import.meta.env.DEV && this.state.error && (
              <details className="text-left bg-muted p-4 rounded-lg text-sm">
                <summary className="cursor-pointer font-mono font-semibold mb-2">
                  Error Details (Development Mode)
                </summary>
                <div className="space-y-2">
                  <div>
                    <strong>Message:</strong>
                    <pre className="mt-1 text-xs overflow-auto">
                      {this.state.error.message}
                    </pre>
                  </div>
                  {this.state.error.stack && (
                    <div>
                      <strong>Stack Trace:</strong>
                      <pre className="mt-1 text-xs overflow-auto max-h-32">
                        {this.state.error.stack}
                      </pre>
                    </div>
                  )}
                </div>
              </details>
            )}

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button 
                onClick={this.handleReset}
                variant="default"
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Try Again
              </Button>
              
              <Button 
                onClick={this.handleReload}
                variant="outline"
              >
                Reload Page
              </Button>
            </div>

            <div className="text-xs text-muted-foreground">
              Error ID: {this.state.errorId}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}