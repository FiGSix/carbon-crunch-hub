
/**
 * Enhanced logger utility with context support
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export type LogContext = Record<string, any>;

interface Logger {
  debug(message: string | LogContext, context?: LogContext): void;
  info(message: string | LogContext, context?: LogContext): void;
  warn(message: string | LogContext, context?: LogContext): void;
  error(message: string | LogContext, context?: LogContext): void;
  withContext(context: LogContext): Logger;
}

const formatLog = (
  level: LogLevel,
  message: string | LogContext,
  baseContext: LogContext = {},
  additionalContext: LogContext = {}
): void => {
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
  
  // Only log context if it has properties
  const hasContext = Object.keys(combinedContext).length > 0;
  
  console[level](
    `[${timestamp}] [${level.toUpperCase()}] ${formattedMessage}`,
    ...(hasContext ? [combinedContext] : [])
  );
};

class LoggerImpl implements Logger {
  private baseContext: LogContext;

  constructor(baseContext: LogContext = {}) {
    this.baseContext = baseContext;
  }

  debug(message: string | LogContext, context: LogContext = {}): void {
    formatLog('debug', message, this.baseContext, context);
  }

  info(message: string | LogContext, context: LogContext = {}): void {
    formatLog('info', message, this.baseContext, context);
  }

  warn(message: string | LogContext, context: LogContext = {}): void {
    formatLog('warn', message, this.baseContext, context);
  }

  error(message: string | LogContext, context: LogContext = {}): void {
    formatLog('error', message, this.baseContext, context);
  }

  withContext(context: LogContext): Logger {
    return new LoggerImpl({ ...this.baseContext, ...context });
  }
}

export const logger = new LoggerImpl();
