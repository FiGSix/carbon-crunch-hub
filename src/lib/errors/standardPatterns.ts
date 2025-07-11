import React from "react";
import { useErrorHandler } from "@/hooks/useErrorHandler";
import { ErrorSeverity } from "@/types/errors";
import { useToast } from "@/hooks/use-toast";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";

/**
 * Standardized error handling patterns for common scenarios
 */

// Standard error messages for consistent user experience
export const STANDARD_ERROR_MESSAGES = {
  // Network errors
  NETWORK_ERROR: "Unable to connect to the server. Please check your internet connection.",
  REQUEST_TIMEOUT: "The request is taking longer than expected. Please try again.",
  SERVER_ERROR: "A server error occurred. Please try again later.",
  
  // Authentication errors
  AUTH_REQUIRED: "You need to be logged in to perform this action.",
  AUTH_EXPIRED: "Your session has expired. Please log in again.",
  INSUFFICIENT_PERMISSIONS: "You don't have permission to perform this action.",
  
  // Validation errors
  INVALID_INPUT: "Please check your input and try again.",
  REQUIRED_FIELD: "This field is required.",
  INVALID_FORMAT: "Please enter a valid format.",
  
  // Data errors
  NOT_FOUND: "The requested item could not be found.",
  ALREADY_EXISTS: "This item already exists.",
  DATA_CONFLICT: "There was a conflict with existing data.",
  
  // File upload errors
  FILE_TOO_LARGE: "File size is too large. Please choose a smaller file.",
  INVALID_FILE_TYPE: "Invalid file type. Please choose a supported format.",
  UPLOAD_FAILED: "File upload failed. Please try again.",
  
  // Generic errors
  UNKNOWN_ERROR: "An unexpected error occurred. Please try again.",
  OPERATION_FAILED: "The operation could not be completed.",
  TRY_AGAIN_LATER: "Something went wrong. Please try again later."
} as const;

// Error severity mapping for common error types
export const ERROR_SEVERITY_MAP: Record<string, ErrorSeverity> = {
  // Network errors - usually retryable
  NETWORK_ERROR: "warning",
  REQUEST_TIMEOUT: "warning",
  
  // Server errors - more serious
  SERVER_ERROR: "error",
  
  // Auth errors - require user action
  AUTH_REQUIRED: "warning",
  AUTH_EXPIRED: "error",
  INSUFFICIENT_PERMISSIONS: "warning",
  
  // Validation - user can fix
  INVALID_INPUT: "warning",
  REQUIRED_FIELD: "warning",
  INVALID_FORMAT: "warning",
  
  // Data errors
  NOT_FOUND: "warning",
  ALREADY_EXISTS: "warning",
  DATA_CONFLICT: "error",
  
  // File errors
  FILE_TOO_LARGE: "warning",
  INVALID_FILE_TYPE: "warning",
  UPLOAD_FAILED: "error",
  
  // Critical errors
  UNKNOWN_ERROR: "error",
  OPERATION_FAILED: "error"
};

/**
 * Standardized error handling hook for common scenarios
 */
export function useStandardErrorHandler(context: string) {
  const errorHandler = useErrorHandler({ 
    context,
    toastOnError: true,
    navigateOnFatal: true
  });

  return {
    ...errorHandler,
    
    // Standardized handlers for common error scenarios
    handleNetworkError: (error: unknown) => {
      return errorHandler.handleError(
        error, 
        STANDARD_ERROR_MESSAGES.NETWORK_ERROR, 
        "warning"
      );
    },

    handleAuthError: (error: unknown, requiresReauth = false) => {
      const severity = requiresReauth ? "error" : "warning";
      const message = requiresReauth 
        ? STANDARD_ERROR_MESSAGES.AUTH_EXPIRED 
        : STANDARD_ERROR_MESSAGES.AUTH_REQUIRED;
      
      return errorHandler.handleError(error, message, severity);
    },

    handleValidationError: (error: unknown, fieldName?: string) => {
      const message = fieldName 
        ? `${fieldName}: ${STANDARD_ERROR_MESSAGES.INVALID_INPUT}`
        : STANDARD_ERROR_MESSAGES.INVALID_INPUT;
      
      return errorHandler.handleError(error, message, "warning");
    },

    handleNotFoundError: (error: unknown, resourceType = "item") => {
      return errorHandler.handleError(
        error, 
        `The requested ${resourceType} could not be found.`, 
        "warning"
      );
    },

    handleFileUploadError: (error: unknown, fileName?: string) => {
      const message = fileName 
        ? `Failed to upload ${fileName}. Please try again.`
        : STANDARD_ERROR_MESSAGES.UPLOAD_FAILED;
      
      return errorHandler.handleError(error, message, "error");
    },

    handleGenericError: (error: unknown, customMessage?: string) => {
      return errorHandler.handleError(
        error, 
        customMessage || STANDARD_ERROR_MESSAGES.UNKNOWN_ERROR, 
        "error"
      );
    }
  };
}

/**
 * Toast message standardization
 */
export function useStandardToast() {
  const { toast } = useToast();

  return {
    success: (message: string) => toast({
      title: "Success",
      description: message,
      variant: "default"
    }),

    error: (message: string) => toast({
      title: "Error",
      description: message,
      variant: "destructive"
    }),

    warning: (message: string) => toast({
      title: "Warning", 
      description: message,
      variant: "destructive"
    }),

    info: (message: string) => toast({
      title: "Info",
      description: message,
      variant: "default"
    }),

    // Standardized toast messages
    networkError: () => toast({
      title: "Connection Error",
      description: STANDARD_ERROR_MESSAGES.NETWORK_ERROR,
      variant: "destructive"
    }),

    authRequired: () => toast({
      title: "Authentication Required",
      description: STANDARD_ERROR_MESSAGES.AUTH_REQUIRED,
      variant: "destructive"
    }),

    permissionDenied: () => toast({
      title: "Permission Denied",
      description: STANDARD_ERROR_MESSAGES.INSUFFICIENT_PERMISSIONS,
      variant: "destructive"
    }),

    saveSuccess: () => toast({
      title: "Saved",
      description: "Your changes have been saved successfully.",
      variant: "default"
    }),

    deleteSuccess: (itemType = "item") => toast({
      title: "Deleted",
      description: `The ${itemType} has been deleted successfully.`,
      variant: "default"
    }),

    createSuccess: (itemType = "item") => toast({
      title: "Created",
      description: `The ${itemType} has been created successfully.`,
      variant: "default"
    }),

    updateSuccess: (itemType = "item") => toast({
      title: "Updated", 
      description: `The ${itemType} has been updated successfully.`,
      variant: "default"
    })
  };
}

/**
 * Error classification utilities
 */
export function classifyError(error: unknown): {
  type: keyof typeof STANDARD_ERROR_MESSAGES;
  severity: ErrorSeverity;
  isRetryable: boolean;
} {
  const errorMessage = String(error).toLowerCase();
  
  // Network errors
  if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
    return {
      type: 'NETWORK_ERROR',
      severity: 'warning',
      isRetryable: true
    };
  }
  
  // Auth errors
  if (errorMessage.includes('unauthorized') || errorMessage.includes('401')) {
    return {
      type: 'AUTH_REQUIRED',
      severity: 'warning',
      isRetryable: false
    };
  }
  
  if (errorMessage.includes('forbidden') || errorMessage.includes('403')) {
    return {
      type: 'INSUFFICIENT_PERMISSIONS',
      severity: 'warning',
      isRetryable: false
    };
  }
  
  // Not found errors
  if (errorMessage.includes('not found') || errorMessage.includes('404')) {
    return {
      type: 'NOT_FOUND',
      severity: 'warning',
      isRetryable: false
    };
  }
  
  // Server errors
  if (errorMessage.includes('500') || errorMessage.includes('server error')) {
    return {
      type: 'SERVER_ERROR',
      severity: 'error',
      isRetryable: true
    };
  }
  
  // Default to unknown error
  return {
    type: 'UNKNOWN_ERROR',
    severity: 'error',
    isRetryable: false
  };
}

/**
 * Utility function to get standardized error message based on error type
 */
export function getStandardErrorMessage(error: unknown): string {
  const errorType = classifyError(error);
  return STANDARD_ERROR_MESSAGES[errorType.type];
}