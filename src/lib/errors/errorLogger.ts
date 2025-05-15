
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
    ...additionalContext,
    ...(details ? { details } : {}),
    ...(code ? { code } : {})
  };

  switch (severity) {
    case "info":
      logger.info(`[${context}] ${message}`, logContext);
      break;
    case "warning":
      logger.warn(`[${context}] ${message}`, logContext);
      break;
    case "error":
    case "fatal":
      logger.error(`[${context}] ${message}`, logContext);
      break;
  }
}
