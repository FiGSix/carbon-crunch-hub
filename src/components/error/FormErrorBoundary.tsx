import React, { Component, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { devLogger } from '@/lib/performance/ConsoleReplacementUtility';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  formName?: string;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  onRetry?: () => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  retryCount: number;
}

/**
 * Form-specific error boundary
 * Provides graceful error handling for complex forms
 */
export class FormErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { 
      hasError: false,
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error
    devLogger.general.error('Form Error Boundary caught an error:', {
      formName: this.props.formName,
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      retryCount: this.state.retryCount
    });

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);
  }

  handleReset = () => {
    this.setState(prevState => ({ 
      hasError: false, 
      error: undefined,
      retryCount: prevState.retryCount + 1
    }));
    
    // Call custom retry handler if provided
    this.props.onRetry?.();
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default form error UI
      return (
        <div className="space-y-4 p-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <div className="font-semibold">
                  {this.props.formName 
                    ? `Error in ${this.props.formName}`
                    : 'Form Error'
                  }
                </div>
                <div className="text-sm">
                  Something went wrong while processing this form. 
                  Your data has been preserved where possible.
                </div>
              </div>
            </AlertDescription>
          </Alert>

          {import.meta.env.DEV && this.state.error && (
            <details className="bg-muted p-3 rounded text-sm">
              <summary className="cursor-pointer font-mono font-semibold">
                Error Details (Development Mode)
              </summary>
              <div className="mt-2 space-y-1">
                <div><strong>Message:</strong> {this.state.error.message}</div>
                {this.state.error.stack && (
                  <div>
                    <strong>Stack:</strong>
                    <pre className="mt-1 text-xs overflow-auto max-h-24 whitespace-pre-wrap">
                      {this.state.error.stack}
                    </pre>
                  </div>
                )}
              </div>
            </details>
          )}

          <div className="flex gap-2">
            <Button 
              onClick={this.handleReset}
              size="sm"
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-3 w-3" />
              Retry
            </Button>
            
            {this.state.retryCount > 0 && (
              <div className="flex items-center text-xs text-muted-foreground">
                Retry attempt: {this.state.retryCount}
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}