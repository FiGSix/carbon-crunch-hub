import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { devLogger } from '@/lib/performance/ConsoleReplacementUtility';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  level?: 'page' | 'section' | 'component';
  name?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
  retryCount: number;
}

/**
 * Phase 3: Progressive Error Boundary
 * Provides different fallback strategies based on error level
 */
export class ProgressiveErrorBoundary extends Component<Props, State> {
  private maxRetries = 2;
  
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { level = 'component', name = 'Unknown' } = this.props;
    
    devLogger.components.error(`[${level}] Error in ${name}:`, {
      error: error.message,
      componentStack: errorInfo.componentStack.split('\n').slice(0, 3).join('\n'),
      level,
      retryCount: this.state.retryCount
    });

    this.setState({ error });
  }

  handleRetry = () => {
    if (this.state.retryCount < this.maxRetries) {
      this.setState(prevState => ({ 
        hasError: false,
        error: undefined,
        retryCount: prevState.retryCount + 1
      }));
    }
  };

  renderFallback() {
    const { level = 'component', name = 'Component' } = this.props;
    const canRetry = this.state.retryCount < this.maxRetries;

    // Custom fallback provided
    if (this.props.fallback) {
      return this.props.fallback;
    }

    // Page-level error - full error UI
    if (level === 'page') {
      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="max-w-md w-full">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Page Error</AlertTitle>
              <AlertDescription>
                <p className="mb-4">This page encountered an error and couldn't load properly.</p>
                {canRetry && (
                  <Button onClick={this.handleRetry} variant="outline" size="sm">
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Try Again ({this.maxRetries - this.state.retryCount} left)
                  </Button>
                )}
              </AlertDescription>
            </Alert>
          </div>
        </div>
      );
    }

    // Section-level error - inline error
    if (level === 'section') {
      return (
        <div className="py-8 px-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Section Unavailable</AlertTitle>
            <AlertDescription>
              <p className="mb-2">The {name} section couldn't load.</p>
              {canRetry && (
                <Button onClick={this.handleRetry} variant="outline" size="sm">
                  <RefreshCw className="mr-2 h-3 w-3" />
                  Retry
                </Button>
              )}
            </AlertDescription>
          </Alert>
        </div>
      );
    }

    // Component-level error - minimal fallback
    return (
      <div 
        className="p-4 border border-red-200 rounded bg-red-50 text-red-800"
        style={{
          padding: '1rem',
          border: '1px solid #fecaca',
          borderRadius: '0.375rem',
          backgroundColor: '#fef2f2',
          color: '#991b1b'
        }}
      >
        <p className="text-sm">
          {name} component unavailable
          {canRetry && (
            <button 
              onClick={this.handleRetry}
              className="ml-2 text-xs underline hover:no-underline"
              style={{ marginLeft: '0.5rem', fontSize: '0.75rem', textDecoration: 'underline' }}
            >
              retry
            </button>
          )}
        </p>
      </div>
    );
  }

  render() {
    if (this.state.hasError) {
      return this.renderFallback();
    }

    return this.props.children;
  }
}