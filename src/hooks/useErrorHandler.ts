
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { createErrorState, extractErrorInfo, ErrorState } from "@/lib/errors/errorState";
import { logError } from "@/lib/errors/errorLogger";
import { showErrorToast } from "@/lib/errors/errorNotification";
import { LogContext } from "@/lib/logger";

export type ErrorSeverity = "info" | "warning" | "error" | "fatal";

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
    // Extract error information
    const { message: extractedMessage, details, code } = extractErrorInfo(err);
    const message = customMessage || extractedMessage;
    
    // Create standardized error state
    const errorState = createErrorState(message, details, code, severity);
    
    // Set the error state
    setError(errorState);
    
    // Log the error
    logError(context, message, details, code, severity);
    
    // Show toast notification if enabled
    if (toastOnError) {
      showErrorToast(toast, message, severity);
    }
    
    // Navigate away on fatal errors if enabled
    if (severity === "fatal" && navigateOnFatal) {
      navigate(fallbackPath, { 
        state: { 
          errorMessage: message,
          errorCode: code
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
  const withErrorHandling = <T,>(
    fn: (...args: any[]) => Promise<T>,
    customMessage?: string,
    severity: ErrorSeverity = "error"
  ) => {
    return async (...args: any[]): Promise<{ data: T | null; error: ErrorState | null }> => {
      try {
        const data = await fn(...args);
        return { data, error: null };
      } catch (err) {
        const errorState = handleError(err, customMessage, severity);
        return { data: null, error: errorState };
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
