import React from 'react';
import { FieldValues, UseFormReturn } from 'react-hook-form';
import { FormErrorBoundary } from '@/components/error/FormErrorBoundary';
import { FormErrorDisplay } from '@/components/ui/form-error-display';
import { useUnifiedFormHandler, FormError } from '@/hooks/useUnifiedFormHandler';
import { Loader2 } from 'lucide-react';

interface UnifiedFormWrapperProps<T extends FieldValues> {
  formName: string;
  form?: UseFormReturn<T>;
  onSubmit: () => Promise<any>;
  children: React.ReactNode;
  className?: string;
  successMessage?: string;
  onSuccess?: (result: any) => void;
  onError?: (error: FormError) => void;
  enableRetry?: boolean;
  retryAttempts?: number;
  showLoadingOverlay?: boolean;
}

export function UnifiedFormWrapper<T extends FieldValues>({
  formName,
  form,
  onSubmit,
  children,
  className = '',
  successMessage,
  onSuccess,
  onError,
  enableRetry = true,
  retryAttempts = 2,
  showLoadingOverlay = true
}: UnifiedFormWrapperProps<T>) {
  const {
    submissionState,
    clearErrors,
    submitFormWithValidation,
    submitForm
  } = useUnifiedFormHandler<T>({
    formName,
    enableToast: true,
    logErrors: true,
    retryAttempts
  });

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const submissionOptions = {
      successMessage,
      onSuccess,
      onError
    };

    if (form) {
      await submitFormWithValidation(onSubmit, form, submissionOptions);
    } else {
      await submitForm(onSubmit, submissionOptions);
    }
  };

  const handleRetry = () => {
    clearErrors();
    handleFormSubmit(new Event('submit') as any);
  };

  const handleDismissError = (index: number) => {
    // Remove specific error by index
    const newErrors = submissionState.errors.filter((_, i) => i !== index);
    // This would require updating the hook to support removing specific errors
    // For now, we'll clear all errors
    clearErrors();
  };

  return (
    <FormErrorBoundary formName={formName}>
      <div className={`relative ${className}`}>
        {/* Loading Overlay */}
        {showLoadingOverlay && submissionState.isSubmitting && (
          <div className="absolute inset-0 bg-background/50 backdrop-blur-sm z-10 flex items-center justify-center rounded-lg">
            <div className="flex items-center space-x-2 bg-background px-4 py-2 rounded-lg shadow-lg">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm font-medium">Processing...</span>
            </div>
          </div>
        )}

        {/* Error Display */}
        {submissionState.hasErrors && (
          <FormErrorDisplay
            errors={submissionState.errors}
            onDismiss={handleDismissError}
            onRetry={enableRetry ? handleRetry : undefined}
            className="mb-4"
          />
        )}

        {/* Form Content */}
        <form onSubmit={handleFormSubmit} noValidate>
          {children}
        </form>
      </div>
    </FormErrorBoundary>
  );
}

// Convenience wrapper for non-react-hook-form forms
interface SimpleFormWrapperProps {
  formName: string;
  onSubmit: () => Promise<any>;
  children: React.ReactNode;
  className?: string;
  successMessage?: string;
  onSuccess?: (result: any) => void;
  onError?: (error: FormError) => void;
  enableRetry?: boolean;
  retryAttempts?: number;
  showLoadingOverlay?: boolean;
}

export function SimpleFormWrapper(props: SimpleFormWrapperProps) {
  return <UnifiedFormWrapper {...props} />;
}