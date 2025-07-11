
import { logger } from "@/lib/logger";

/**
 * Create a logger instance for token operations
 */
export function createTokenLogger() {
  return logger.withContext({
    component: 'useInvitationToken',
    feature: 'proposals'
  });
}

/**
 * Log token validation start
 */
export function logTokenValidationStart(token: string) {
  const tokenLogger = createTokenLogger();
  
  tokenLogger.info("🚀 Starting token validation", { 
    tokenPrefix: token.substring(0, 8),
    tokenLength: token.length,
    timestamp: new Date().toISOString()
  });
}

/**
 * Log token validation completion
 */
export function logTokenValidationComplete(success: boolean, valid: boolean) {
  const tokenLogger = createTokenLogger();
  
  if (success) {
    tokenLogger.info("✅ Token validation completed", { success, valid });
  } else {
    tokenLogger.error("❌ Token validation failed", { success, valid });
  }
}
