import { logger } from '@/lib/logger';

interface AuthErrorEvent {
  message: string;
  code?: string;
  details?: string;
}

interface OperationContext {
  operation: string;
  userId?: string;
  retryAttempt?: number;
}

/**
 * Phase 3: Enhanced auth event service with intelligent error handling
 */
export class OptimizedAuthEventService {
  private static errorPatterns = {
    sessionExpired: /session.*expired|invalid.*session|token.*expired/i,
    networkError: /network.*error|fetch.*failed|connection.*refused/i,
    invalidRefresh: /invalid.*refresh|refresh.*token.*not.*found/i,
    rateLimit: /rate.*limit|too.*many.*requests/i,
    authRequired: /auth.*required|unauthorized|permission.*denied/i
  };

  /**
   * Check if an error indicates authentication is required and dispatch recovery event
   */
  static handlePotentialAuthError(
    errorInfo: AuthErrorEvent,
    context: OperationContext = { operation: 'unknown' }
  ): boolean {
    const { message, code, details } = errorInfo;
    const fullMessage = `${message} ${code || ''} ${details || ''}`.toLowerCase();

    // Check for session expiry patterns
    if (this.errorPatterns.sessionExpired.test(fullMessage)) {
      logger.warn('Session expired detected, triggering recovery', {
        operation: context.operation,
        errorMessage: message,
        code
      });
      
      this.dispatchAuthRecoveryEvent('session_expired', context);
      return true;
    }

    // Check for invalid refresh token
    if (this.errorPatterns.invalidRefresh.test(fullMessage)) {
      logger.warn('Invalid refresh token detected, requiring re-authentication', {
        operation: context.operation,
        errorMessage: message,
        code
      });
      
      this.dispatchAuthRequiredEvent('invalid_refresh_token', context);
      return true;
    }

    // Check for network errors - don't immediately require auth
    if (this.errorPatterns.networkError.test(fullMessage)) {
      logger.info('Network error detected, will retry when connection restored', {
        operation: context.operation,
        errorMessage: message,
        code
      });
      
      // Dispatch network error event for connectivity monitoring
      this.dispatchNetworkErrorEvent(context);
      return false; // Don't treat as auth error
    }

    // Check for rate limiting
    if (this.errorPatterns.rateLimit.test(fullMessage)) {
      logger.warn('Rate limit detected, implementing backoff', {
        operation: context.operation,
        errorMessage: message,
        code
      });
      
      this.dispatchRateLimitEvent(context);
      return false; // Don't treat as auth error
    }

    return false;
  }

  /**
   * Dispatch authentication recovery event for automatic retry
   */
  private static dispatchAuthRecoveryEvent(reason: string, context: OperationContext) {
    const event = new CustomEvent('auth-recovery', {
      detail: {
        reason,
        operation: context.operation,
        timestamp: Date.now(),
        retryAttempt: context.retryAttempt || 0
      }
    });
    
    window.dispatchEvent(event);
  }

  /**
   * Dispatch authentication required event for user re-login
   */
  private static dispatchAuthRequiredEvent(reason: string, context: OperationContext) {
    const event = new CustomEvent('auth-required', {
      detail: {
        reason,
        operation: context.operation,
        timestamp: Date.now(),
        message: 'Your session has expired. Please sign in again to continue.'
      }
    });
    
    window.dispatchEvent(event);
  }

  /**
   * Dispatch network error event for connectivity handling
   */
  private static dispatchNetworkErrorEvent(context: OperationContext) {
    const event = new CustomEvent('network-error', {
      detail: {
        operation: context.operation,
        timestamp: Date.now()
      }
    });
    
    window.dispatchEvent(event);
  }

  /**
   * Dispatch rate limit event for backoff implementation
   */
  private static dispatchRateLimitEvent(context: OperationContext) {
    const event = new CustomEvent('rate-limit', {
      detail: {
        operation: context.operation,
        timestamp: Date.now(),
        retryAfter: 30000 // 30 seconds default
      }
    });
    
    window.dispatchEvent(event);
  }

  /**
   * Enhanced error logging with context
   */
  static logAuthEvent(
    level: 'info' | 'warn' | 'error',
    message: string,
    context: OperationContext & { [key: string]: any } = { operation: 'unknown' }
  ): void {
    const authLogger = logger.withContext({
      component: 'OptimizedAuthEventService',
      feature: 'auth-reliability'
    });

    switch (level) {
      case 'info':
        authLogger.info(message, context);
        break;
      case 'warn':
        authLogger.warn(message, context);
        break;
      case 'error':
        authLogger.error(message, context);
        break;
    }
  }
}