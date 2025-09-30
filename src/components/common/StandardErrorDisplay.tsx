
import { AlertTriangle, RefreshCw, Wifi, ShieldAlert, FileX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ErrorState } from '@/types/errors';

interface StandardErrorDisplayProps {
  error: ErrorState;
  onRetry?: () => void;
  onDismiss?: () => void;
  className?: string;
}

/**
 * Standardized error display component for consistent error presentation
 */
export function StandardErrorDisplay({ 
  error, 
  onRetry, 
  onDismiss, 
  className = "" 
}: StandardErrorDisplayProps) {
  const getErrorIcon = () => {
    if (error.message.toLowerCase().includes('network') || error.message.toLowerCase().includes('connection')) {
      return <Wifi className="w-5 h-5" />;
    }
    
    if (error.message.toLowerCase().includes('permission') || error.message.toLowerCase().includes('unauthorized')) {
      return <ShieldAlert className="w-5 h-5" />;
    }
    
    if (error.message.toLowerCase().includes('not found')) {
      return <FileX className="w-5 h-5" />;
    }
    
    return <AlertTriangle className="w-5 h-5" />;
  };

  const getVariant = () => {
    switch (error.severity) {
      case 'warning':
        return 'default';
      case 'error':
      case 'fatal':
        return 'destructive';
      default:
        return 'default';
    }
  };

  return (
    <Alert variant={getVariant()} className={className}>
      {getErrorIcon()}
      <AlertTitle>
        {error.severity === 'fatal' ? 'Critical Error' : 
         error.severity === 'error' ? 'Error' : 
         error.severity === 'warning' ? 'Warning' : 'Notice'}
      </AlertTitle>
      <AlertDescription className="space-y-3">
        <p>{error.message}</p>
        
        {(onRetry || onDismiss) && (
          <div className="flex space-x-2">
            {onRetry && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRetry}
                className="flex items-center space-x-2"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Try Again</span>
              </Button>
            )}
            
            {onDismiss && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onDismiss}
              >
                Dismiss
              </Button>
            )}
          </div>
        )}
        
        {process.env.NODE_ENV === 'development' && error.details && (
          <details className="mt-2">
            <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
              Error Details (Development)
            </summary>
            <pre className="mt-1 text-xs text-muted-foreground whitespace-pre-wrap overflow-auto max-h-32 p-2 bg-muted rounded">
              {error.details}
            </pre>
          </details>
        )}
      </AlertDescription>
    </Alert>
  );
}

/**
 * Inline error display for form fields and small components
 */
export function InlineErrorDisplay({ 
  error, 
  className = "" 
}: { 
  error: ErrorState; 
  className?: string; 
}) {
  return (
    <div className={`flex items-center space-x-2 text-sm text-destructive ${className}`}>
      <AlertTriangle className="w-4 h-4" />
      <span>{error.message}</span>
    </div>
  );
}

/**
 * Minimal error display for constrained spaces
 */
export function MinimalErrorDisplay({ 
  error, 
  className = "" 
}: { 
  error: ErrorState; 
  className?: string; 
}) {
  return (
    <div className={`flex items-center justify-center p-2 text-xs text-destructive bg-destructive/5 rounded border border-destructive/20 ${className}`}>
      <AlertTriangle className="w-3 h-3 mr-1" />
      <span className="truncate">{error.message}</span>
    </div>
  );
}