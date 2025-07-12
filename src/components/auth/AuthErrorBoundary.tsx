import React, { Component, ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { authLogger } from '@/lib/logger';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  shouldRedirectToLogin: boolean;
}

/**
 * Error boundary specifically for authentication-related errors
 * Prevents auth component crashes from breaking the entire app
 */
export class AuthErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { 
      hasError: false,
      shouldRedirectToLogin: false
    };
  }

  static getDerivedStateFromError(error: Error): State {
    // Check if it's an auth-related error that should trigger login redirect
    const authErrorPatterns = [
      'Rendered more hooks',
      'Invalid session',
      'Auth error',
      'Session expired',
      'useAuth must be used within an AuthProvider'
    ];
    
    const shouldRedirectToLogin = authErrorPatterns.some(pattern => 
      error.message.includes(pattern)
    );

    return {
      hasError: true,
      error,
      shouldRedirectToLogin
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    authLogger.error('Auth component error caught by boundary', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      shouldRedirectToLogin: this.state.shouldRedirectToLogin
    });
  }

  handleReset = () => {
    this.setState({ 
      hasError: false, 
      error: undefined,
      shouldRedirectToLogin: false 
    });
  };

  render() {
    if (this.state.hasError) {
      // If it's an auth error, redirect to login
      if (this.state.shouldRedirectToLogin) {
        return <Navigate to="/login" replace />;
      }

      // Use custom fallback or default error UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex items-center justify-center min-h-[200px] p-4">
          <div className="text-center max-w-md">
            <h3 className="text-lg font-semibold text-destructive mb-2">
              Authentication Error
            </h3>
            <p className="text-muted-foreground mb-4">
              An error occurred with the authentication system. Please try refreshing the page.
            </p>
            {import.meta.env.DEV && this.state.error && (
              <details className="text-left bg-muted p-2 rounded text-xs mb-4">
                <summary className="cursor-pointer font-mono">Error Details</summary>
                <pre className="mt-2 whitespace-pre-wrap">
                  {this.state.error.message}
                  {this.state.error.stack && `\n\nStack:\n${this.state.error.stack}`}
                </pre>
              </details>
            )}
            <button
              onClick={this.handleReset}
              className="bg-primary text-primary-foreground px-4 py-2 rounded hover:bg-primary/90"
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}