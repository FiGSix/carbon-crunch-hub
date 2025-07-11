
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { ErrorState, ErrorSeverity, createErrorState, toErrorState } from "@/types/errors";
import { logError } from "@/lib/errors/errorLogger";
import { showErrorToast } from "@/lib/errors/errorNotification";
import { LogContext } from "@/lib/logger";
import { AsyncFunction, Result } from "@/types/utility";

// Re-export ErrorSeverity for backwards compatibility
export type { ErrorSeverity };

interface ErrorHandlerOptions {
  context: string;
  toastOnError?: boolean;
  navigateOnFatal?: boolean;
  fallbackPath?: string;
}

/**
 * A unified hook for handling errors across the application
 * 
 * @param options Configuration options for the error handler
 * @returns Error handling utilities and state
 */
export function useErrorHandler(options: ErrorHandlerOptions) {
  const { context, toastOnError = true, navigateOnFatal = true, fallbackPath = "/" } = options;
  const [error, setError] = useState<ErrorState | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();
  
  /**
   * Handle an error with appropriate logging and UI feedback
   */
  const handleError = (
    err: unknown, 
    customMessage?: string,
    severity: ErrorSeverity = "error"
  ) => {
    // Convert unknown error to ErrorState
    const baseErrorState = toErrorState(err);
    const message = customMessage || baseErrorState.message;
    
    // Create standardized error state
    const errorState = createErrorState(message, {
      code: baseErrorState.code,
      details: baseErrorState.details,
      severity,
      context
    });
    
    // Set the error state
    setError(errorState);
    
    // Log the error
    logError(context, message, errorState.details, errorState.code, severity);
    
    // Show toast notification if enabled
    if (toastOnError) {
      showErrorToast(toast, message, severity);
    }
    
    // Navigate away on fatal errors if enabled
    if (severity === "fatal" && navigateOnFatal) {
      navigate(fallbackPath, { 
        state: { 
          errorMessage: message,
          errorCode: errorState.code
        } 
      });
    }
    
    return errorState;
  };
  
  /**
   * Clear the current error state
   */
  const clearError = () => setError(null);
  
  /**
   * Check if there is an active error
   */
  const hasError = error !== null;
  
  /**
   * Wrap an async function with error handling
   */
  const withErrorHandling = <T, TArgs extends readonly unknown[] = []>(
    fn: AsyncFunction<TArgs, T>,
    customMessage?: string,
    severity: ErrorSeverity = "error"
  ) => {
    return async (...args: TArgs): Promise<Result<T, ErrorState>> => {
      try {
        const data = await fn(...args);
        return { success: true, data };
      } catch (err) {
        const errorState = handleError(err, customMessage, severity);
        return { success: false, error: errorState };
      }
    };
  };
  
  return {
    error,
    hasError,
    handleError,
    clearError,
    withErrorHandling
  };
}
