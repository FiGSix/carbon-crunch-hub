import React from 'react';
import { LoadingSpinner } from '@/components/ui/loading';
import { AlertCircle, Wifi, WifiOff } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NetworkStatusProps {
  isOnline?: boolean;
  className?: string;
}

/**
 * Network status indicator for enterprise reliability
 */
export function NetworkStatus({ isOnline = true, className }: NetworkStatusProps) {
  return (
    <div className={cn(
      'fixed bottom-4 right-4 z-50 flex items-center gap-2 px-3 py-2 rounded-lg shadow-lg transition-all',
      isOnline 
        ? 'bg-green-50 text-green-700 border border-green-200' 
        : 'bg-red-50 text-red-700 border border-red-200',
      className
    )}>
      {isOnline ? (
        <Wifi className="h-4 w-4" />
      ) : (
        <WifiOff className="h-4 w-4" />
      )}
      <span className="text-sm font-medium">
        {isOnline ? 'Connected' : 'Offline'}
      </span>
    </div>
  );
}

interface SystemStatusProps {
  status: 'operational' | 'degraded' | 'outage';
  message?: string;
  className?: string;
}

/**
 * System status banner for enterprise monitoring
 */
export function SystemStatus({ status, message, className }: SystemStatusProps) {
  const statusConfig = {
    operational: {
      bg: 'bg-green-50',
      text: 'text-green-800',
      border: 'border-green-200',
      icon: '✅',
      defaultMessage: 'All systems operational'
    },
    degraded: {
      bg: 'bg-yellow-50', 
      text: 'text-yellow-800',
      border: 'border-yellow-200',
      icon: '⚠️',
      defaultMessage: 'Some systems experiencing issues'
    },
    outage: {
      bg: 'bg-red-50',
      text: 'text-red-800', 
      border: 'border-red-200',
      icon: '🚫',
      defaultMessage: 'Service temporarily unavailable'
    }
  };

  const config = statusConfig[status];

  if (status === 'operational') return null;

  return (
    <div className={cn(
      'w-full p-3 border-b flex items-center justify-center gap-2',
      config.bg,
      config.text,
      config.border,
      className
    )}>
      <span>{config.icon}</span>
      <span className="text-sm font-medium">
        {message || config.defaultMessage}
      </span>
    </div>
  );
}

interface ValidationIndicatorProps {
  isValidating: boolean;
  hasError?: boolean;
  errorMessage?: string;
  className?: string;
}

/**
 * Real-time validation feedback for forms
 */
export function ValidationIndicator({ 
  isValidating, 
  hasError, 
  errorMessage,
  className 
}: ValidationIndicatorProps) {
  if (!isValidating && !hasError) return null;

  return (
    <div className={cn('flex items-center gap-1 mt-1', className)}>
      {isValidating ? (
        <>
          <LoadingSpinner size="xs" />
          <span className="text-xs text-muted-foreground">Validating...</span>
        </>
      ) : hasError ? (
        <>
          <AlertCircle className="h-3 w-3 text-destructive" />
          <span className="text-xs text-destructive">{errorMessage}</span>
        </>
      ) : null}
    </div>
  );
}

interface LoadingStatesIndicatorProps {
  activeOperations: string[];
  className?: string;
}

/**
 * Development helper to show active loading operations
 */
export function LoadingStatesIndicator({ activeOperations, className }: LoadingStatesIndicatorProps) {
  if (!import.meta.env.DEV || activeOperations.length === 0) return null;

  return (
    <div className={cn(
      'fixed bottom-20 right-4 z-50 bg-slate-900 text-white p-3 rounded-lg shadow-lg max-w-xs',
      className
    )}>
      <div className="text-xs font-medium mb-2">Active Loading Operations:</div>
      <div className="space-y-1">
        {activeOperations.map((operation, index) => (
          <div key={index} className="flex items-center gap-2 text-xs">
            <LoadingSpinner size="xs" />
            <span className="truncate">{operation}</span>
          </div>
        ))}
      </div>
    </div>
  );
}