import React, { Component, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';
import { devLogger } from '@/lib/performance/ConsoleReplacementUtility';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  componentName?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
}

/**
 * Lightweight error boundary for individual components
 * Prevents single component failures from crashing the entire page
 */
export class ComponentErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    devLogger.components.error('Component Error Boundary caught an error:', {
      componentName: this.props.componentName,
      error: error.message,
      componentStack: errorInfo.componentStack
    });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Minimal error UI that doesn't disrupt the page layout
      return (
        <div className="border border-destructive/20 bg-destructive/5 rounded-lg p-4 text-center">
          <div className="flex items-center justify-center gap-2 text-destructive mb-2">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm font-medium">
              {this.props.componentName 
                ? `${this.props.componentName} Error`
                : 'Component Error'
              }
            </span>
          </div>
          
          <p className="text-xs text-muted-foreground mb-3">
            This component encountered an error and couldn't load.
          </p>
          
          <Button 
            onClick={this.handleReset}
            size="sm"
            variant="outline"
          >
            Retry
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}