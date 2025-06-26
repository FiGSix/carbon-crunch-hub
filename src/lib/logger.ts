
/**
 * Enhanced logger utility with environment awareness and categories
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export type LogCategory = 'auth' | 'api' | 'component' | 'hook' | 'service' | 'validation' | 'proposal' | 'dashboard' | 'client' | 'general';

export type LogContext = Record<string, any>;

interface Logger {
  debug(message: string | LogContext, context?: LogContext): void;
  info(message: string | LogContext, context?: LogContext): void;
  warn(message: string | LogContext, context?: LogContext): void;
  error(message: string | LogContext, context?: LogContext): void;
  withContext(context: LogContext): Logger;
  withCategory(category: LogCategory): Logger;
}

interface LoggerConfig {
  enabledInProduction: boolean;
  minLevel: LogLevel;
  categories: LogCategory[];
}

// Configuration for different environments
const getLoggerConfig = (): LoggerConfig => {
  const isDev = import.meta.env.DEV;
  
  if (isDev) {
    return {
      enabledInProduction: true,
      minLevel: 'debug',
      categories: ['auth', 'api', 'component', 'hook', 'service', 'validation', 'proposal', 'dashboard', 'client', 'general']
    };
  } else {
    return {
      enabledInProduction: true,
      minLevel: 'warn', // Only warn and error in production
      categories: ['auth', 'api', 'service', 'validation'] // Only critical categories in production
    };
  }
};

const config = getLoggerConfig();

const shouldLog = (level: LogLevel, category?: LogCategory): boolean => {
  const levelPriority = { debug: 0, info: 1, warn: 2, error: 3 };
  const minPriority = levelPriority[config.minLevel];
  const currentPriority = levelPriority[level];
  
  // Check level priority
  if (currentPriority < minPriority) {
    return false;
  }
  
  // Check category allowlist
  if (category && !config.categories.includes(category)) {
    return false;
  }
  
  return true;
};

const formatLog = (
  level: LogLevel,
  message: string | LogContext,
  baseContext: LogContext = {},
  additionalContext: LogContext = {},
  category?: LogCategory
): void => {
  if (!shouldLog(level, category)) {
    return;
  }

  const timestamp = new Date().toISOString();
  let formattedMessage: string;
  let combinedContext: LogContext = {};
  
  // Handle both string messages and object messages
  if (typeof message === 'string') {
    formattedMessage = message;
    combinedContext = { ...baseContext, ...additionalContext };
  } else {
    // If message is an object, extract message property if it exists
    if ('message' in message && typeof message.message === 'string') {
      formattedMessage = message.message;
      // Remove message from context to avoid duplication
      const { message: msgProp, ...restContext } = message;
      combinedContext = { ...baseContext, ...restContext, ...additionalContext };
    } else {
      // No message property, use a default message
      formattedMessage = `[${level.toUpperCase()}] Log entry`;
      combinedContext = { ...baseContext, ...message, ...additionalContext };
    }
  }
  
  // Add category to context if provided
  if (category) {
    combinedContext.category = category;
  }
  
  // Only log context if it has properties
  const hasContext = Object.keys(combinedContext).length > 0;
  
  // Create formatted prefix
  const categoryPrefix = category ? `[${category.toUpperCase()}]` : '';
  const prefix = `[${timestamp}] [${level.toUpperCase()}] ${categoryPrefix}`.trim();
  
  console[level](
    `${prefix} ${formattedMessage}`,
    ...(hasContext ? [combinedContext] : [])
  );
};

class LoggerImpl implements Logger {
  private baseContext: LogContext;
  private category?: LogCategory;

  constructor(baseContext: LogContext = {}, category?: LogCategory) {
    this.baseContext = baseContext;
    this.category = category;
  }

  debug(message: string | LogContext, context: LogContext = {}): void {
    formatLog('debug', message, this.baseContext, context, this.category);
  }

  info(message: string | LogContext, context: LogContext = {}): void {
    formatLog('info', message, this.baseContext, context, this.category);
  }

  warn(message: string | LogContext, context: LogContext = {}): void {
    formatLog('warn', message, this.baseContext, context, this.category);
  }

  error(message: string | LogContext, context: LogContext = {}): void {
    formatLog('error', message, this.baseContext, context, this.category);
  }

  withContext(context: LogContext): Logger {
    return new LoggerImpl({ ...this.baseContext, ...context }, this.category);
  }

  withCategory(category: LogCategory): Logger {
    return new LoggerImpl(this.baseContext, category);
  }
}

// Export main logger instance
export const logger = new LoggerImpl();

// Export category-specific loggers for convenience
export const authLogger = logger.withCategory('auth');
export const apiLogger = logger.withCategory('api');
export const componentLogger = logger.withCategory('component');
export const hookLogger = logger.withCategory('hook');
export const serviceLogger = logger.withCategory('service');
export const validationLogger = logger.withCategory('validation');
export const proposalLogger = logger.withCategory('proposal');
export const dashboardLogger = logger.withCategory('dashboard');
export const clientLogger = logger.withCategory('client');
