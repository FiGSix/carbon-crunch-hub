import React from 'react';
import { LoadingSpinner } from '@/components/ui/loading';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface GlobalLoadingBarProps {
  isLoading: boolean;
  className?: string;
}

/**
 * Global loading bar for page transitions
 */
export function GlobalLoadingBar({ isLoading, className }: GlobalLoadingBarProps) {
  return (
    <div className={cn(
      'fixed top-0 left-0 right-0 z-[100] h-1 bg-primary/20',
      className
    )}>
      <div 
        className={cn(
          'h-full bg-primary transition-all duration-300 ease-out',
          isLoading ? 'w-full animate-pulse' : 'w-0'
        )}
      />
    </div>
  );
}

interface DataLoadingProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

/**
 * Data loading indicator for API calls
 */
export function DataLoading({ 
  message = "Loading data...",
  size = 'md',
  showIcon = true,
  className
}: DataLoadingProps) {
  const sizeMap = {
    sm: 'text-sm',
    md: 'text-base', 
    lg: 'text-lg'
  };

  return (
    <div className={cn(
      'flex items-center justify-center gap-3 p-8',
      className
    )}>
      {showIcon && <LoadingSpinner size={size} />}
      <span className={cn(
        'text-muted-foreground font-medium',
        sizeMap[size]
      )}>
        {message}
      </span>
    </div>
  );
}

interface AsyncButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean;
  loadingText?: string;
  children: React.ReactNode;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

/**
 * Button with built-in async loading state
 */
export function AsyncButton({ 
  isLoading = false,
  loadingText,
  children,
  disabled,
  className,
  variant = 'default',
  size = 'default',
  ...props
}: AsyncButtonProps) {
  return (
    <Button
      variant={variant}
      size={size}
      disabled={disabled || isLoading}
      className={cn(
        'relative',
        isLoading && 'cursor-not-allowed',
        className
      )}
      {...props}
    >
      {isLoading && (
        <LoadingSpinner 
          size="xs" 
          className="mr-2" 
        />
      )}
      <span className={isLoading ? 'opacity-70' : ''}>
        {isLoading && loadingText ? loadingText : children}
      </span>
    </Button>
  );
}

interface FormLoadingOverlayProps {
  isLoading: boolean;
  message?: string;
  children: React.ReactNode;
}

/**
 * Loading overlay for forms during submission
 */
export function FormLoadingOverlay({ 
  isLoading, 
  message = "Submitting...",
  children 
}: FormLoadingOverlayProps) {
  return (
    <div className="relative">
      {children}
      {isLoading && (
        <div className="absolute inset-0 bg-background/50 backdrop-blur-[1px] flex items-center justify-center z-10 rounded-lg">
          <div className="bg-card p-4 rounded-lg shadow-lg border flex items-center gap-3">
            <LoadingSpinner size="sm" />
            <span className="text-sm font-medium">{message}</span>
          </div>
        </div>
      )}
    </div>
  );
}

interface ContentLoadingProps {
  isLoading: boolean;
  error?: string | null;
  isEmpty?: boolean;
  loadingMessage?: string;
  emptyMessage?: string;
  emptyAction?: {
    label: string;
    onClick: () => void;
  };
  children: React.ReactNode;
  className?: string;
}

/**
 * Comprehensive content loading with error and empty states
 */
export function ContentLoading({
  isLoading,
  error,
  isEmpty = false,
  loadingMessage = "Loading content...",
  emptyMessage = "No data available",
  emptyAction,
  children,
  className
}: ContentLoadingProps) {
  if (isLoading) {
    return (
      <div className={cn('py-12', className)}>
        <DataLoading message={loadingMessage} />
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn('py-12 text-center', className)}>
        <div className="space-y-4">
          <div className="text-destructive font-medium">
            Failed to load content
          </div>
          <div className="text-sm text-muted-foreground">
            {error}
          </div>
          <Button 
            variant="outline" 
            onClick={() => window.location.reload()}
          >
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div className={cn('py-12 text-center', className)}>
        <div className="space-y-4">
          <div className="text-muted-foreground font-medium">
            {emptyMessage}
          </div>
          {emptyAction && (
            <Button 
              variant="outline" 
              onClick={emptyAction.onClick}
            >
              {emptyAction.label}
            </Button>
          )}
        </div>
      </div>
    );
  }

  return <div className={className}>{children}</div>;
}

interface SearchLoadingProps {
  isLoading: boolean;
  query: string;
  resultCount?: number;
}

/**
 * Search-specific loading indicator
 */
export function SearchLoading({ isLoading, query, resultCount }: SearchLoadingProps) {
  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground p-4">
        <LoadingSpinner size="xs" />
        <span>Searching for "{query}"...</span>
      </div>
    );
  }

  if (resultCount !== undefined) {
    return (
      <div className="text-sm text-muted-foreground p-4">
        {resultCount === 0 
          ? `No results found for "${query}"`
          : `${resultCount} result${resultCount === 1 ? '' : 's'} for "${query}"`
        }
      </div>
    );
  }

  return null;
}

interface ProgressLoadingProps {
  progress: number;
  message?: string;
  className?: string;
}

/**
 * Progress bar loading for file uploads and long operations
 */
export function ProgressLoading({ 
  progress, 
  message = "Processing...",
  className 
}: ProgressLoadingProps) {
  return (
    <div className={cn('space-y-3 p-4', className)}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{message}</span>
        <span className="text-sm text-muted-foreground">{Math.round(progress)}%</span>
      </div>
      <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
        <div 
          className="h-full bg-primary transition-all duration-300 ease-out"
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        />
      </div>
    </div>
  );
}