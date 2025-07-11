/**
 * Phase 1: Centralized error handling utilities
 * Provides consistent error handling patterns across the application
 */

import { errorReportingService } from '@/services/errorReportingService';

export interface AppError {
  message: string;
  code?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  context?: Record<string, any>;
  userMessage?: string;
}

/**
 * Creates a standardized app error
 */
export function createAppError(
  message: string,
  code?: string,
  severity: AppError['severity'] = 'medium',
  context?: Record<string, any>,
  userMessage?: string
): AppError {
  return {
    message,
    code,
    severity,
    context,
    userMessage: userMessage || getDefaultUserMessage(severity)
  };
}

/**
 * Handles errors consistently across the application
 */
export async function handleError(
  error: Error | AppError,
  context?: Record<string, any>
): Promise<AppError> {
  let appError: AppError;

  if ('severity' in error) {
    // Already an AppError
    appError = error;
  } else {
    // Convert Error to AppError
    appError = createAppError(
      error.message,
      undefined,
      'medium',
      { ...context, stack: error.stack }
    );
  }

  // Report the error
  try {
    await errorReportingService.reportError(
      new Error(appError.message),
      { ...appError.context, ...context },
      appError.severity
    );
  } catch (reportingError) {
    console.error('Failed to report error:', reportingError);
  }

  return appError;
}

/**
 * Handles authentication errors specifically
 */
export async function handleAuthError(error: Error, userId?: string): Promise<AppError> {
  const appError = createAppError(
    error.message,
    'AUTH_ERROR',
    'high',
    { userId },
    'Authentication failed. Please try signing in again.'
  );

  await errorReportingService.reportAuthError(error, userId);
  return appError;
}

/**
 * Handles API errors specifically
 */
export async function handleApiError(
  error: Error,
  endpoint: string,
  method: string
): Promise<AppError> {
  const appError = createAppError(
    error.message,
    'API_ERROR',
    'medium',
    { endpoint, method },
    'Service temporarily unavailable. Please try again.'
  );

  await errorReportingService.reportApiError(error, endpoint, method);
  return appError;
}

/**
 * Gets default user-friendly message based on severity
 */
function getDefaultUserMessage(severity: AppError['severity']): string {
  switch (severity) {
    case 'critical':
      return 'A critical error occurred. Please contact support immediately.';
    case 'high':
      return 'An important error occurred. Please try again or contact support.';
    case 'medium':
      return 'Something went wrong. Please try again.';
    case 'low':
      return 'A minor issue occurred. You can continue using the application.';
    default:
      return 'An unexpected error occurred.';
  }
}

/**
 * Retry wrapper with exponential backoff
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt === maxRetries) {
        throw lastError;
      }

      // Exponential backoff: delay = baseDelay * 2^attempt
      const delay = baseDelay * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}