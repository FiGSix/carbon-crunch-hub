
import { ErrorSeverity } from "@/hooks/useErrorHandler";

export interface ErrorState {
  message: string | null;
  details?: string | null;
  code?: string | null;
  severity: ErrorSeverity;
  timestamp: number;
}

/**
 * Create a standardized error state object
 */
export function createErrorState(
  message: string,
  details: string | null = null,
  code: string | null = null,
  severity: ErrorSeverity = "error"
): ErrorState {
  return {
    message,
    details,
    code,
    severity,
    timestamp: Date.now()
  };
}

/**
 * Extract useful information from an error object
 */
export function extractErrorInfo(err: unknown): { 
  message: string; 
  details: string | null; 
  code: string | null;
} {
  const isErrorObject = err instanceof Error;
  const message = isErrorObject ? err.message : String(err);
  const details = isErrorObject && err.stack ? err.stack : null;
  const errorCode = (err as any)?.code || (err as any)?.statusCode || null;
  
  return { message, details, code: errorCode };
}
