import { useState, useCallback } from 'react';
import { FieldErrors, FieldValues, UseFormReturn } from 'react-hook-form';
import { useToast } from '@/hooks/use-toast';
import { ErrorHandler } from '@/services/unified/utils/ErrorHandler';
import { logger } from '@/lib/logger';

export interface FormError {
  field?: string;
  message: string;
  type: 'validation' | 'network' | 'server' | 'authentication';
}

export interface FormSubmissionState {
  isSubmitting: boolean;
  errors: FormError[];
  hasErrors: boolean;
}

interface UnifiedFormHandlerOptions {
  formName: string;
  enableToast?: boolean;
  logErrors?: boolean;
  retryAttempts?: number;
  networkTimeout?: number;
}

export function useUnifiedFormHandler<T extends FieldValues>({
  formName,
  enableToast = true,
  logErrors = true,
  retryAttempts = 0,
  networkTimeout = 30000
}: UnifiedFormHandlerOptions) {
  const { toast } = useToast();
  const [submissionState, setSubmissionState] = useState<FormSubmissionState>({
    isSubmitting: false,
    errors: [],
    hasErrors: false
  });

  const formLogger = logger.withContext({ component: 'UnifiedFormHandler', formName });

  /**
   * Clear all form errors
   */
  const clearErrors = useCallback(() => {
    setSubmissionState(prev => ({
      ...prev,
      errors: [],
      hasErrors: false
    }));
  }, []);

  /**
   * Add a new error to the form state
   */
  const addError = useCallback((error: FormError) => {
    setSubmissionState(prev => ({
      ...prev,
      errors: [...prev.errors, error],
      hasErrors: true
    }));
  }, []);

  /**
   * Process validation errors from react-hook-form
   */
  const processValidationErrors = useCallback((fieldErrors: FieldErrors<T>) => {
    const formErrors: FormError[] = [];
    
    Object.entries(fieldErrors).forEach(([field, error]) => {
      if (error?.message) {
        formErrors.push({
          field,
          message: String(error.message),
          type: 'validation'
        });
      }
    });

    if (formErrors.length > 0) {
      setSubmissionState(prev => ({
        ...prev,
        errors: [...prev.errors, ...formErrors],
        hasErrors: true
      }));

      if (enableToast) {
        toast({
          title: 'Validation Error',
          description: `Please fix the following issues: ${formErrors.map(e => e.message).join(', ')}`,
          variant: 'destructive'
        });
      }

      if (logErrors) {
        formLogger.warn('Form validation errors', { fieldErrors: formErrors });
      }
    }

    return formErrors;
  }, [enableToast, toast, formLogger, logErrors]);

  /**
   * Process and categorize submission errors
   */
  const processSubmissionError = useCallback((error: unknown): FormError => {
    let formError: FormError;

    // Check if it's a network error
    if (error instanceof TypeError && error.message.includes('fetch')) {
      formError = {
        message: 'Network connection failed. Please check your internet connection and try again.',
        type: 'network'
      };
    }
    // Check if it's an authentication error
    else if (ErrorHandler.isAuthError(error)) {
      formError = {
        message: 'Your session has expired. Please sign in again.',
        type: 'authentication'
      };
    }
    // Check if it's an RLS error
    else if (ErrorHandler.isRLSError(error)) {
      formError = {
        message: 'You do not have permission to perform this action.',
        type: 'server'
      };
    }
    // Handle API/server errors
    else if (error && typeof error === 'object' && 'message' in error) {
      const errorMessage = String(error.message);
      
      // Common server error patterns
      if (errorMessage.includes('duplicate') || errorMessage.includes('already exists')) {
        formError = {
          message: 'This information already exists in our system. Please use different details.',
          type: 'server'
        };
      } else if (errorMessage.includes('timeout') || errorMessage.includes('TIMEOUT')) {
        formError = {
          message: 'The request timed out. Please try again.',
          type: 'network'
        };
      } else if (errorMessage.includes('500')) {
        formError = {
          message: 'Server error occurred. Please try again later.',
          type: 'server'
        };
      } else {
        formError = {
          message: errorMessage || 'An unexpected error occurred. Please try again.',
          type: 'server'
        };
      }
    }
    // Fallback for unknown errors
    else {
      formError = {
        message: 'An unexpected error occurred. Please try again.',
        type: 'server'
      };
    }

    // Log the error if enabled
    if (logErrors) {
      formLogger.error('Form submission error', { 
        error: error instanceof Error ? error.message : String(error),
        errorType: formError.type,
        formName 
      });
    }

    return formError;
  }, [formLogger, logErrors, formName]);

  /**
   * Handle form submission with unified error handling
   */
  const handleSubmission = useCallback(async <R>(
    submitFunction: () => Promise<R>,
    form?: UseFormReturn<T>,
    options?: {
      successMessage?: string;
      onSuccess?: (result: R) => void;
      onError?: (error: FormError) => void;
      skipValidation?: boolean;
    }
  ): Promise<{ success: boolean; data?: R; error?: FormError }> => {
    // Clear previous errors
    clearErrors();

    // Validate form if react-hook-form is provided and validation is not skipped
    if (form && !options?.skipValidation) {
      const isValid = await form.trigger();
      if (!isValid) {
        const validationErrors = processValidationErrors(form.formState.errors);
        return { success: false, error: validationErrors[0] };
      }
    }

    setSubmissionState(prev => ({ ...prev, isSubmitting: true }));

    let attempts = 0;
    const maxAttempts = retryAttempts + 1;

    while (attempts < maxAttempts) {
      try {
        formLogger.debug('Form submission attempt', { attempt: attempts + 1, maxAttempts });

        // Add timeout to the submission
        const submissionPromise = submitFunction();
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Request timeout')), networkTimeout);
        });

        const result = await Promise.race([submissionPromise, timeoutPromise]);

        // Success
        setSubmissionState(prev => ({ ...prev, isSubmitting: false }));

        if (enableToast && options?.successMessage) {
          toast({
            title: 'Success',
            description: options.successMessage
          });
        }

        if (options?.onSuccess) {
          options.onSuccess(result);
        }

        formLogger.info('Form submission successful', { formName });
        return { success: true, data: result };

      } catch (error) {
        attempts++;
        
        if (attempts >= maxAttempts) {
          // Final attempt failed
          const formError = processSubmissionError(error);
          addError(formError);

          setSubmissionState(prev => ({ ...prev, isSubmitting: false }));

          if (enableToast) {
            toast({
              title: 'Error',
              description: formError.message,
              variant: 'destructive'
            });
          }

          if (options?.onError) {
            options.onError(formError);
          }

          return { success: false, error: formError };
        }

        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempts - 1) * 1000));
        formLogger.warn('Form submission retry', { attempt: attempts, error: error instanceof Error ? error.message : String(error) });
      }
    }

    // This should never be reached, but TypeScript needs it
    const fallbackError: FormError = {
      message: 'Submission failed after all retry attempts',
      type: 'server'
    };
    return { success: false, error: fallbackError };
  }, [
    clearErrors,
    processValidationErrors,
    addError,
    processSubmissionError,
    enableToast,
    toast,
    formLogger,
    retryAttempts,
    networkTimeout,
    formName
  ]);

  /**
   * Simple wrapper for form submission without react-hook-form
   */
  const submitForm = useCallback(async <R>(
    submitFunction: () => Promise<R>,
    options?: {
      successMessage?: string;
      onSuccess?: (result: R) => void;
      onError?: (error: FormError) => void;
    }
  ) => {
    return handleSubmission(submitFunction, undefined, { ...options, skipValidation: true });
  }, [handleSubmission]);

  /**
   * Wrapper for react-hook-form submissions
   */
  const submitFormWithValidation = useCallback(async <R>(
    submitFunction: () => Promise<R>,
    form: UseFormReturn<T>,
    options?: {
      successMessage?: string;
      onSuccess?: (result: R) => void;
      onError?: (error: FormError) => void;
    }
  ) => {
    return handleSubmission(submitFunction, form, options);
  }, [handleSubmission]);

  return {
    submissionState,
    clearErrors,
    addError,
    processValidationErrors,
    submitForm,
    submitFormWithValidation,
    isSubmitting: submissionState.isSubmitting,
    hasErrors: submissionState.hasErrors,
    errors: submissionState.errors
  };
}