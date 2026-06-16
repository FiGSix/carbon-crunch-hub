/**
 * Console Replacement Utility
 * Provides conditional logging via the structured logger system.
 * All categories route through @/lib/logger for environment-aware output.
 */

import { logger, type LogContext } from '@/lib/logger';

interface ConditionalLogger {
  log: (...args: any[]) => void;
  warn: (...args: any[]) => void;
  info: (...args: any[]) => void;
  debug: (...args: any[]) => void;
  error: (...args: any[]) => void;
}

function createConditionalLogger(context: string): ConditionalLogger {
  const contextLogger = logger.withContext({ context });

  const formatArgs = (args: any[]): string =>
    args.map(arg => (typeof arg === 'string' ? arg : String(arg))).join(' ');

  return {
    log: (...args: any[]) => contextLogger.info(formatArgs(args)),
    warn: (...args: any[]) => contextLogger.warn(formatArgs(args)),
    info: (...args: any[]) => contextLogger.info(formatArgs(args)),
    debug: (...args: any[]) => contextLogger.debug(formatArgs(args)),
    error: (...args: any[]) => contextLogger.error(formatArgs(args)),
  };
}

export const devLogger = {
  auth: createConditionalLogger('auth'),
  proposals: createConditionalLogger('proposals'),
  clients: createConditionalLogger('clients'),
  api: createConditionalLogger('api'),
  components: createConditionalLogger('components'),
  realtime: createConditionalLogger('realtime'),
  maps: createConditionalLogger('maps'),
  testing: createConditionalLogger('testing'),
  dashboard: createConditionalLogger('dashboard'),
  notifications: createConditionalLogger('notifications'),
  general: createConditionalLogger('general'),
};

export const dev = {
  log: devLogger.general.log,
  warn: devLogger.general.warn,
  info: devLogger.general.info,
  debug: devLogger.general.debug,
  error: devLogger.general.error,
};

export { createConditionalLogger as createLogger };
