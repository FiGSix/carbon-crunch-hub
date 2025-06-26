
import { authLogger } from '@/lib/logger';

/**
 * Service for handling authentication-related events
 */
export class AuthEventService {
  /**
   * Dispatch an 'auth-required' event when authentication is needed
   * This is typically called when RLS rules deny access due to expired/invalid tokens
   */
  static dispatchAuthRequired(context?: {
    error?: string;
    operation?: string;
    table?: string;
  }) {
    const event = new CustomEvent('auth-required', {
      detail: {
        timestamp: new Date().toISOString(),
        context: context || {},
        message: 'Authentication required - session may be expired'
      }
    });

    authLogger.info('Dispatching auth-required event', {
      context,
      timestamp: event.detail.timestamp
    });

    window.dispatchEvent(event);
  }

  /**
   * Check if an error indicates authentication is required
   * Common RLS error patterns that suggest expired/invalid auth
   */
  static shouldDispatchAuthRequired(error: any): boolean {
    if (!error) return false;

    const errorMessage = error.message || error.error || '';
    const errorCode = error.code || '';

    // Common patterns that indicate auth issues
    const authErrorPatterns = [
      'JWT expired',
      'invalid JWT',
      'access_denied',
      'insufficient_privilege',
      'new row violates row-level security',
      'permission denied',
      'not authenticated',
      'authentication required'
    ];

    return authErrorPatterns.some(pattern => 
      errorMessage.toLowerCase().includes(pattern.toLowerCase()) ||
      errorCode.toLowerCase().includes(pattern.toLowerCase())
    );
  }

  /**
   * Handle potential auth errors and dispatch auth-required if needed
   */
  static handlePotentialAuthError(error: any, context?: {
    operation?: string;
    table?: string;
  }) {
    if (this.shouldDispatchAuthRequired(error)) {
      this.dispatchAuthRequired({
        error: error.message || error.error || 'Unknown auth error',
        ...context
      });
      return true; // Indicates auth-required was dispatched
    }
    return false; // Not an auth error
  }
}
