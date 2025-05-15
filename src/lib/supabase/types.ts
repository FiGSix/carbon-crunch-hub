

/**
 * Types for our user roles
 */
export type UserRole = 'client' | 'agent' | 'admin';

/**
 * Standardized error response type
 */
export interface ErrorResponse {
  code?: string;
  message: string;
  details?: string | null;
}

/**
 * Common API response structure
 */
export interface ApiResponse<T> {
  data: T | null;
  error: ErrorResponse | null;
  success: boolean;
}

