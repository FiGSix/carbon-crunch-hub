import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Wifi, Shield, Server, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FormError } from '@/hooks/useUnifiedFormHandler';

interface FormErrorDisplayProps {
  errors: FormError[];
  onDismiss?: (index: number) => void;
  onRetry?: () => void;
  className?: string;
}

const getErrorIcon = (type: FormError['type']) => {
  switch (type) {
    case 'network':
      return Wifi;
    case 'authentication':
      return Shield;
    case 'server':
      return Server;
    case 'validation':
    default:
      return AlertTriangle;
  }
};

const getErrorVariant = (type: FormError['type']): 'default' | 'destructive' => {
  switch (type) {
    case 'validation':
      return 'default';
    case 'network':
    case 'server':
    case 'authentication':
    default:
      return 'destructive';
  }
};

export function FormErrorDisplay({ 
  errors, 
  onDismiss, 
  onRetry, 
  className = '' 
}: FormErrorDisplayProps) {
  if (errors.length === 0) return null;

  return (
    <div className={`space-y-2 ${className}`}>
      {errors.map((error, index) => {
        const Icon = getErrorIcon(error.type);
        const variant = getErrorVariant(error.type);
        const showRetry = error.type === 'network' && onRetry;

        return (
          <Alert key={index} variant={variant} className="relative">
            <Icon className="h-4 w-4" />
            <AlertDescription className="pr-12">
              {error.field && (
                <span className="font-medium capitalize">{error.field}: </span>
              )}
              {error.message}
              {showRetry && (
                <div className="mt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onRetry}
                    className="h-7 px-2 text-xs"
                  >
                    Try Again
                  </Button>
                </div>
              )}
            </AlertDescription>
            {onDismiss && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1 h-6 w-6 p-0 hover:bg-transparent"
                onClick={() => onDismiss(index)}
                aria-label="Dismiss error"
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </Alert>
        );
      })}
    </div>
  );
}

// Field-specific error display for react-hook-form
interface FieldErrorDisplayProps {
  errors: FormError[];
  fieldName: string;
  className?: string;
}

export function FieldErrorDisplay({ 
  errors, 
  fieldName, 
  className = '' 
}: FieldErrorDisplayProps) {
  const fieldErrors = errors.filter(error => error.field === fieldName);
  
  if (fieldErrors.length === 0) return null;

  return (
    <div className={`text-sm text-destructive ${className}`}>
      {fieldErrors.map((error, index) => (
        <p key={index} role="alert" aria-live="polite">
          {error.message}
        </p>
      ))}
    </div>
  );
}