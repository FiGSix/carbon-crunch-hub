
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
    timestamp: new Date().toISOString()
  });
  
  if (import.meta.env.DEV) {
    console.log("🚀 === STARTING TOKEN VALIDATION ===");
    console.log(`📋 Token: ${token.substring(0, 8)}... (length: ${token.length})`);
  }
}

/**
 * Log token validation completion
 */
export function logTokenValidationComplete(success: boolean, valid: boolean) {
  const tokenLogger = createTokenLogger();
  
  if (success) {
    if (import.meta.env.DEV) {
      console.log("✅ Token validation completed successfully");
    }
    tokenLogger.info("✅ Token validation completed", { success, valid });
  } else {
    if (import.meta.env.DEV) {
      console.error("❌ Token validation failed");
    }
    tokenLogger.error("❌ Token validation failed", { success, valid });
  }
}
