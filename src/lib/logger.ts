
/**
 * A type-safe logger that helps manage console output based on environment
 * In production builds, most console methods will be stripped by Terser
 * except for errors
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  component?: string;
  feature?: string;
  [key: string]: any;
}

export interface Logger {
  debug: (message: string, context?: LogContext, ...args: unknown[]) => void;
  info: (message: string, context?: LogContext, ...args: unknown[]) => void;
  warn: (message: string, context?: LogContext, ...args: unknown[]) => void;
  error: (message: string, context?: LogContext | Error, ...args: unknown[]) => void;
  withContext: (context: LogContext) => Logger;
}

const isProduction = import.meta.env.PROD;
const LOG_PREFIX = '[CrunchCarbon]';

/**
 * Create a formatted log message with standardized structure
 */
const formatMessage = (level: LogLevel, message: string, context?: LogContext): string => {
  const timestamp = new Date().toISOString();
  const contextStr = context ? Object.keys(context).length > 0 ? ` [${Object.entries(context)
    .filter(([key]) => key !== 'error' && key !== 'stack')
    .map(([key, value]) => `${key}=${value}`)
    .join(', ')}]` : '' : '';

  return `${LOG_PREFIX} ${timestamp} [${level.toUpperCase()}]${contextStr} ${message}`;
};

/**
 * Process and extract useful information from an error object
 */
const processError = (error: Error): LogContext => {
  return {
    name: error.name,
    message: error.message,
    stack: error.stack,
    ...(error as any)
  };
};

/**
 * Create the base logger instance
 */
const createLogger = (baseContext: LogContext = {}): Logger => {
  return {
    debug: (message: string, context?: LogContext, ...args: unknown[]) => {
      if (!isProduction) {
        const mergedContext = { ...baseContext, ...context };
        console.debug(formatMessage('debug', message, mergedContext), ...args);
      }
    },

    info: (message: string, context?: LogContext, ...args: unknown[]) => {
      if (!isProduction) {
        const mergedContext = { ...baseContext, ...context };
        console.info(formatMessage('info', message, mergedContext), ...args);
      }
    },

    warn: (message: string, context?: LogContext, ...args: unknown[]) => {
      if (!isProduction) {
        const mergedContext = { ...baseContext, ...context };
        console.warn(formatMessage('warn', message, mergedContext), ...args);
      }
    },

    error: (message: string, contextOrError?: LogContext | Error, ...args: unknown[]) => {
      // Always log errors, even in production
      let mergedContext: LogContext = { ...baseContext };
      
      if (contextOrError instanceof Error) {
        // Extract error details
        mergedContext = { ...mergedContext, ...processError(contextOrError) };
      } else if (contextOrError) {
        // Regular context object
        mergedContext = { ...mergedContext, ...contextOrError };
      }
      
      console.error(formatMessage('error', message, mergedContext), ...args);
    },

    withContext: (context: LogContext): Logger => {
      return createLogger({ ...baseContext, ...context });
    }
  };
};

// Create and export the default logger instance
export const logger = createLogger();

// Create specialized logger instances for common contexts
export const authLogger = logger.withContext({ feature: 'auth' });
export const apiLogger = logger.withContext({ feature: 'api' });
export const proposalLogger = logger.withContext({ feature: 'proposals' });

export default logger;
