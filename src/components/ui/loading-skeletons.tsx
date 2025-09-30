
import { cn } from '@/lib/utils';

interface LoadingCardProps {
  className?: string;
  hasHeader?: boolean;
  hasFooter?: boolean;
  rows?: number;
}

/**
 * Card skeleton loader
 */
export function LoadingCard({ 
  className,
  hasHeader = true,
  hasFooter = false,
  rows = 3
}: LoadingCardProps) {
  return (
    <div className={cn(
      'rounded-lg border bg-card p-6 space-y-4 animate-pulse',
      className
    )}>
      {hasHeader && (
        <div className="space-y-2">
          <div className="h-5 bg-muted rounded w-1/3" />
          <div className="h-4 bg-muted rounded w-1/2" />
        </div>
      )}
      
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="space-y-2">
            <div className={cn(
              'h-4 bg-muted rounded',
              i === 0 ? 'w-full' : i === rows - 1 ? 'w-2/3' : 'w-5/6'
            )} />
          </div>
        ))}
      </div>
      
      {hasFooter && (
        <div className="flex gap-2 pt-2">
          <div className="h-9 bg-muted rounded w-20" />
          <div className="h-9 bg-muted rounded w-16" />
        </div>
      )}
    </div>
  );
}

interface LoadingListProps {
  items?: number;
  className?: string;
  showHeader?: boolean;
}

/**
 * List skeleton loader
 */
export function LoadingList({ 
  items = 5,
  className,
  showHeader = true
}: LoadingListProps) {
  return (
    <div className={cn('space-y-4', className)}>
      {showHeader && (
        <div className="flex items-center justify-between">
          <div className="h-6 bg-muted rounded w-32 animate-pulse" />
          <div className="h-9 bg-muted rounded w-24 animate-pulse" />
        </div>
      )}
      
      <div className="space-y-3">
        {Array.from({ length: items }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 animate-pulse">
            <div className="h-10 w-10 bg-muted rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-muted rounded w-1/4" />
              <div className="h-3 bg-muted rounded w-1/2" />
            </div>
            <div className="h-8 w-16 bg-muted rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

interface LoadingGridProps {
  items?: number;
  columns?: number;
  className?: string;
}

/**
 * Grid skeleton loader
 */
export function LoadingGrid({ 
  items = 6,
  columns = 3,
  className
}: LoadingGridProps) {
  return (
    <div className={cn(
      'grid gap-4',
      columns === 2 ? 'grid-cols-2' : 
      columns === 3 ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' :
      columns === 4 ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4' :
      'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
      className
    )}>
      {Array.from({ length: items }).map((_, i) => (
        <LoadingCard key={i} rows={2} />
      ))}
    </div>
  );
}

interface LoadingFormProps {
  fields?: number;
  className?: string;
  hasSubmit?: boolean;
}

/**
 * Form skeleton loader
 */
export function LoadingForm({ 
  fields = 4,
  className,
  hasSubmit = true
}: LoadingFormProps) {
  return (
    <div className={cn('space-y-6', className)}>
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-2 animate-pulse">
          <div className="h-4 bg-muted rounded w-24" />
          <div className="h-10 bg-muted rounded w-full" />
        </div>
      ))}
      
      {hasSubmit && (
        <div className="flex gap-3 pt-4">
          <div className="h-10 bg-muted rounded w-24 animate-pulse" />
          <div className="h-10 bg-muted rounded w-20 animate-pulse" />
        </div>
      )}
    </div>
  );
}