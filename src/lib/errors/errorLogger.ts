
import { logger } from "@/lib/logger";
import { ErrorSeverity } from "@/hooks/useErrorHandler";
import { LogContext } from "@/lib/logger";
import { OptimizedAuthEventService } from '@/services/auth/OptimizedAuthEventService';

/**
 * Log an error with the appropriate severity level
 */
export function logError(
  context: string,
  message: string,
  details: string | null = null,
  code: string | null = null,
  severity: ErrorSeverity = "error",
  additionalContext: LogContext = {}
): void {
  const logContext: LogContext = {
    context,
    ...additionalContext,
    ...(details ? { details } : {}),
    ...(code ? { code } : {})
  };

  // Check if this error indicates auth is required
  const errorInfo = {
    message,
    code,
    details
  };

  const isAuthError = OptimizedAuthEventService.handlePotentialAuthError(errorInfo, {
    operation: context
  });

  // Use the appropriate logger based on context
  const contextLogger = logger.withCategory('general').withContext({ context });

  switch (severity) {
    case "info":
      contextLogger.info(message, logContext);
      break;
    case "warning":
      contextLogger.warn(message, logContext);
      break;
    case "error":
    case "fatal":
      contextLogger.error(message, {
        ...logContext,
        authErrorDispatchedWhen: isAuthError ? 'error_logged' : 'not_auth_error'
      });
      break;
  }
}
