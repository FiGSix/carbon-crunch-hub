
/**
 * Enhanced error handler for RLS and security-related errors
 */
export class ErrorHandler {
  /**
   * Check if error is RLS-related
   */
  static isRLSError(error: any): boolean {
    return error?.code === 'PGRST116' || 
           error?.code === '42501' || 
           error?.message?.includes('permission') ||
           error?.message?.includes('row-level security') ||
           error?.message?.includes('policy');
  }

  /**
   * Check if error is authentication-related
   */
  static isAuthError(error: any): boolean {
    return error?.code === 'PGRST301' ||
           error?.message?.includes('JWT') ||
           error?.message?.includes('authentication') ||
           error?.message?.includes('unauthorized');
  }

  /**
   * Handle RLS errors gracefully
   */
  static handleRLSError(error: any, context: string): {
    shouldReturnEmpty: boolean;
    message: string;
    requiresReauth: boolean;
  } {
    console.error(`RLS Error in ${context}:`, error);

    if (this.isAuthError(error)) {
      return {
        shouldReturnEmpty: true,
        message: 'Authentication required. Please sign in again.',
        requiresReauth: true
      };
    }

    if (this.isRLSError(error)) {
      return {
        shouldReturnEmpty: true,
        message: 'Access restricted. Please ensure you have the correct permissions.',
        requiresReauth: false
      };
    }

    return {
      shouldReturnEmpty: false,
      message: error.message || 'An unexpected error occurred',
      requiresReauth: false
    };
  }

  /**
   * Log security events for auditing
   */
  static logSecurityEvent(event: {
    type: 'access_denied' | 'auth_failure' | 'rls_violation' | 'unauthorized_access';
    userId?: string;
    resource: string;
    action: string;
    details?: any;
  }): void {
    console.warn('Security Event:', {
      timestamp: new Date().toISOString(),
      ...event
    });
  }
}
