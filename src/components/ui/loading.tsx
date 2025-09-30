
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export type LoadingSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type LoadingVariant = 'spinner' | 'dots' | 'pulse' | 'skeleton';

interface BaseLoadingProps {
  className?: string;
  size?: LoadingSize;
  variant?: LoadingVariant;
  text?: string;
  children?: React.ReactNode;
}

const sizeClasses = {
  xs: 'h-3 w-3',
  sm: 'h-4 w-4', 
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
  xl: 'h-12 w-12'
};

const textSizeClasses = {
  xs: 'text-xs',
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg',
  xl: 'text-xl'
};

/**
 * Basic loading spinner - most common use case
 */
export function LoadingSpinner({ 
  className, 
  size = 'md',
  text 
}: BaseLoadingProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Loader2 className={cn('animate-spin text-primary', sizeClasses[size])} />
      {text && (
        <span className={cn('text-muted-foreground', textSizeClasses[size])}>
          {text}
        </span>
      )}
    </div>
  );
}

/**
 * Loading dots animation - subtle alternative
 */
export function LoadingDots({ 
  className, 
  size = 'md',
  text 
}: BaseLoadingProps) {
  const dotSize = size === 'xs' ? 'w-1 h-1' : size === 'sm' ? 'w-1.5 h-1.5' : 'w-2 h-2';
  
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="flex space-x-1">
        <div className={cn('bg-primary rounded-full animate-pulse', dotSize)} 
             style={{ animationDelay: '0ms' }} />
        <div className={cn('bg-primary rounded-full animate-pulse', dotSize)} 
             style={{ animationDelay: '150ms' }} />
        <div className={cn('bg-primary rounded-full animate-pulse', dotSize)} 
             style={{ animationDelay: '300ms' }} />
      </div>
      {text && (
        <span className={cn('text-muted-foreground', textSizeClasses[size])}>
          {text}
        </span>
      )}
    </div>
  );
}

/**
 * Pulsing container - for content that's loading
 */
export function LoadingPulse({ 
  className, 
  children 
}: BaseLoadingProps) {
  return (
    <div className={cn('animate-pulse opacity-60', className)}>
      {children}
    </div>
  );
}

/**
 * Skeleton loader for structured content
 */
export function LoadingSkeleton({ 
  className,
  children 
}: BaseLoadingProps) {
  if (children) {
    return (
      <div className={cn('animate-pulse', className)}>
        {children}
      </div>
    );
  }
  
  return (
    <div className={cn('animate-pulse bg-muted rounded', className)} />
  );
}

/**
 * Unified Loading component that supports all variants
 */
export function Loading({ 
  variant = 'spinner',
  size = 'md',
  className,
  text,
  children
}: BaseLoadingProps) {
  switch (variant) {
    case 'dots':
      return <LoadingDots size={size} className={className} text={text} />;
    case 'pulse':
      return <LoadingPulse className={className}>{children}</LoadingPulse>;
    case 'skeleton':
      return <LoadingSkeleton className={className}>{children}</LoadingSkeleton>;
    case 'spinner':
    default:
      return <LoadingSpinner size={size} className={className} text={text} />;
  }
}