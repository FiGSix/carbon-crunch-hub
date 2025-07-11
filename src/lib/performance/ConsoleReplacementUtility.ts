/**
 * Console Replacement Utility
 * Systematic replacement for 445+ console statements
 * Provides conditional logging with proper categorization
 */

import { createConditionalLogger } from './ConsoleOptimizer';

// Create category-specific loggers for different parts of the app
export const devLogger = {
  // Authentication & Auth flows
  auth: createConditionalLogger('auth'),
  
  // Proposal operations
  proposals: createConditionalLogger('proposals'),
  
  // Client management
  clients: createConditionalLogger('clients'),
  
  // API calls and network requests
  api: createConditionalLogger('api'),
  
  // Component lifecycle and rendering
  components: createConditionalLogger('components'),
  
  // Real-time subscriptions and events
  realtime: createConditionalLogger('realtime'),
  
  // Google Maps and external services
  maps: createConditionalLogger('maps'),
  
  // Testing and diagnostics
  testing: createConditionalLogger('testing'),
  
  // Dashboard and statistics
  dashboard: createConditionalLogger('dashboard'),
  
  // Notifications
  notifications: createConditionalLogger('notifications'),
  
  // General/uncategorized
  general: createConditionalLogger('general')
};

/**
 * Legacy console replacement for immediate migration
 * Use this to replace console.* calls throughout the app
 */
export const dev = {
  log: devLogger.general.log,
  warn: devLogger.general.warn,
  info: devLogger.general.info,
  debug: devLogger.general.debug,
  error: devLogger.general.error
};

/**
 * Context-aware logger factory
 * Creates a logger with specific context for better tracing
 */
export function createLogger(context: string) {
  return createConditionalLogger(context);
}

/**
 * Quick replacements for common console patterns
 */
export const quickReplace = {
  // Replace console.log("Starting...", data)
  start: (operation: string, data?: any) => 
    devLogger.general.info(`🚀 Starting ${operation}`, data),
  
  // Replace console.log("Success:", result)
  success: (operation: string, result?: any) => 
    devLogger.general.info(`✅ ${operation} completed`, result),
  
  // Replace console.error("Error:", error)
  error: (operation: string, error: any) => 
    devLogger.general.error(`❌ ${operation} failed`, error),
  
  // Replace console.log("Debug info:", data)
  debug: (operation: string, data?: any) => 
    devLogger.general.debug(`🔍 ${operation}`, data),
  
  // Replace console.warn("Warning:", warning)  
  warn: (operation: string, warning?: any) => 
    devLogger.general.warn(`⚠️ ${operation}`, warning)
};