
import { logger } from "@/lib/logger";
import { ErrorSeverity } from "@/hooks/useErrorHandler";
import { LogContext } from "@/lib/logger";

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
      contextLogger.error(message, logContext);
      break;
  }
}
