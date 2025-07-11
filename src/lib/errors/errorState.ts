
// Re-export types and functions from the new error system
export type { ErrorState, ErrorSeverity } from "@/types/errors";
export { createErrorState, toErrorState } from "@/types/errors";

/**
 * @deprecated Use toErrorState from @/types/errors instead
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
  // Use type assertion with better type safety
  const errorCode = (err as { code?: string | number; statusCode?: string | number })?.code || 
                   (err as { code?: string | number; statusCode?: string | number })?.statusCode || 
                   null;
  
  return { message, details, code: String(errorCode) };
}
