import React from 'react';
import { cn } from '@/lib/utils';

interface LoadingOverlayProps {
  isLoading: boolean;
  children: React.ReactNode;
  className?: string;
  overlay?: 'blur' | 'dim' | 'solid';
  spinnerSize?: 'sm' | 'md' | 'lg';
  text?: string;
}

/**
 * Loading overlay component for existing content
 */
export function LoadingOverlay({
  isLoading,
  children,
  className,
  overlay = 'blur',
  spinnerSize = 'md',
  text
}: LoadingOverlayProps) {
  const overlayClasses = {
    blur: 'backdrop-blur-sm bg-background/60',
    dim: 'bg-background/80',
    solid: 'bg-background'
  };

  const spinnerSizes = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8', 
    lg: 'h-12 w-12'
  };

  return (
    <div className={cn('relative', className)}>
      {children}
      
      {isLoading && (
        <div className={cn(
          'absolute inset-0 flex items-center justify-center z-50',
          overlayClasses[overlay]
        )}>
          <div className="text-center space-y-3">
            <div className={cn(
              'animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto',
              spinnerSizes[spinnerSize]
            )} />
            {text && (
              <p className="text-sm font-medium text-foreground">
                {text}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

interface LoadingStateProps {
  loading: boolean;
  error?: string | null;
  empty?: boolean;
  children: React.ReactNode;
  loadingComponent?: React.ReactNode;
  errorComponent?: React.ReactNode;
  emptyComponent?: React.ReactNode;
  className?: string;
}

/**
 * Comprehensive loading state manager
 */
export function LoadingState({
  loading,
  error,
  empty,
  children,
  loadingComponent,
  errorComponent,
  emptyComponent,
  className
}: LoadingStateProps) {
  if (loading) {
    return (
      <div className={className}>
        {loadingComponent || (
          <div className="flex items-center justify-center p-8">
            <div className="text-center space-y-3">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent mx-auto" />
              <p className="text-sm text-muted-foreground">Loading...</p>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (error) {
    return (
      <div className={className}>
        {errorComponent || (
          <div className="flex items-center justify-center p-8">
            <div className="text-center space-y-3">
              <div className="text-destructive text-sm font-medium">
                Something went wrong
              </div>
              <p className="text-xs text-muted-foreground">
                {error}
              </p>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (empty) {
    return (
      <div className={className}>
        {emptyComponent || (
          <div className="flex items-center justify-center p-8">
            <div className="text-center space-y-3">
              <p className="text-sm text-muted-foreground">No data available</p>
            </div>
          </div>
        )}
      </div>
    );
  }

  return <div className={className}>{children}</div>;
}