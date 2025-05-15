
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { logger } from "@/lib/logger";
import { useNavigate } from "react-router-dom";

export type ErrorSeverity = "info" | "warning" | "error" | "fatal";

interface ErrorHandlerOptions {
  context: string;
  toastOnError?: boolean;
  navigateOnFatal?: boolean;
  fallbackPath?: string;
}

export interface ErrorState {
  message: string | null;
  details?: string | null;
  code?: string | null;
  severity: ErrorSeverity;
  timestamp: number;
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
    const isErrorObject = err instanceof Error;
    const message = customMessage || (isErrorObject ? err.message : String(err));
    const details = isErrorObject && err.stack ? err.stack : null;
    const errorCode = (err as any)?.code || (err as any)?.statusCode || null;
    
    // Create standardized error state
    const errorState: ErrorState = {
      message,
      details,
      code: errorCode,
      severity,
      timestamp: Date.now()
    };
    
    // Set the error state
    setError(errorState);
    
    // Log based on severity
    switch (severity) {
      case "info":
        logger.info(`[${context}] ${message}`, { details, code: errorCode });
        break;
      case "warning":
        logger.warn(`[${context}] ${message}`, { details, code: errorCode });
        break;
      case "error":
      case "fatal":
        logger.error(`[${context}] ${message}`, { details, code: errorCode });
        break;
    }
    
    // Show toast notification if enabled
    if (toastOnError) {
      toast({
        title: severity === "fatal" ? "Critical Error" : 
               severity === "error" ? "Error" : 
               severity === "warning" ? "Warning" : "Notice",
        description: message,
        variant: severity === "info" ? "default" : "destructive"
      });
    }
    
    // Navigate away on fatal errors if enabled
    if (severity === "fatal" && navigateOnFatal) {
      navigate(fallbackPath, { 
        state: { 
          errorMessage: message,
          errorCode: errorCode
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

