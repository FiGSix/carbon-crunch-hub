import React from 'react';
import { LoadingSpinner, LoadingDots, LoadingSkeleton } from './loading';
import { cn } from '@/lib/utils';

interface PageLoadingProps {
  title?: string;
  description?: string;
  className?: string;
  minimal?: boolean;
}

/**
 * Full-page loading state for route transitions
 */
export function PageLoading({ 
  title = "Loading page...",
  description,
  className,
  minimal = false
}: PageLoadingProps) {
  if (minimal) {
    return (
      <div className={cn('flex items-center justify-center p-8', className)}>
        <LoadingSpinner size="lg" text={title} />
      </div>
    );
  }

  return (
    <div className={cn(
      'flex items-center justify-center min-h-screen p-4',
      className
    )}>
      <div className="text-center space-y-4 max-w-md">
        <LoadingSpinner size="xl" />
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">
            {title}
          </h2>
          {description && (
            <p className="text-sm text-muted-foreground">
              {description}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

interface SectionLoadingProps {
  title?: string;
  rows?: number;
  className?: string;
}

/**
 * Section loading for parts of a page
 */
export function SectionLoading({ 
  title = "Loading...",
  rows = 3,
  className
}: SectionLoadingProps) {
  return (
    <div className={cn('space-y-4 p-4', className)}>
      <div className="flex items-center gap-3">
        <LoadingSpinner size="sm" />
        <span className="text-sm text-muted-foreground">{title}</span>
      </div>
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <LoadingSkeleton 
            key={i}
            className={cn(
              'h-4 rounded',
              i === 0 ? 'w-3/4' : i === rows - 1 ? 'w-1/2' : 'w-full'
            )}
          />
        ))}
      </div>
    </div>
  );
}

interface TableLoadingProps {
  title?: string;
  columns?: number;
  rows?: number;
  className?: string;
}

/**
 * Table loading skeleton
 */
export function TableLoading({ 
  title = "Loading data...",
  columns = 4,
  rows = 5,
  className
}: TableLoadingProps) {
  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <LoadingSpinner size="sm" />
          <span className="font-medium text-muted-foreground">{title}</span>
        </div>
        <LoadingSkeleton className="h-9 w-24 rounded-md" />
      </div>
      
      <div className="space-y-3">
        {/* Header row */}
        <div className="flex gap-4">
          {Array.from({ length: columns }).map((_, i) => (
            <LoadingSkeleton key={i} className="h-4 flex-1 rounded" />
          ))}
        </div>
        
        {/* Data rows */}
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="flex gap-4">
            {Array.from({ length: columns }).map((_, colIndex) => (
              <LoadingSkeleton 
                key={colIndex} 
                className={cn(
                  'h-4 rounded',
                  colIndex === 0 ? 'flex-2' : 'flex-1'
                )}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

interface ButtonLoadingProps {
  children: React.ReactNode;
  loading?: boolean;
  loadingText?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * Button with integrated loading state
 */
export function ButtonLoading({ 
  children,
  loading = false,
  loadingText,
  size = 'md',
  className
}: ButtonLoadingProps) {
  const spinnerSize = size === 'sm' ? 'xs' : size === 'lg' ? 'md' : 'sm';
  
  return (
    <span className={cn('flex items-center gap-2', className)}>
      {loading && <LoadingSpinner size={spinnerSize} />}
      <span>{loading && loadingText ? loadingText : children}</span>
    </span>
  );
}

interface InlineLoadingProps {
  text?: string;
  size?: 'sm' | 'md';
  variant?: 'spinner' | 'dots';
  className?: string;
}

/**
 * Inline loading for smaller UI elements
 */
export function InlineLoading({ 
  text = "Loading...",
  size = 'sm',
  variant = 'spinner',
  className
}: InlineLoadingProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      {variant === 'dots' ? (
        <LoadingDots size={size} />
      ) : (
        <LoadingSpinner size={size} />
      )}
      <span className={cn(
        'text-muted-foreground',
        size === 'sm' ? 'text-sm' : 'text-base'
      )}>
        {text}
      </span>
    </div>
  );
}