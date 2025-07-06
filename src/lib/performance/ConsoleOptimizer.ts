/**
 * Phase 1: Console Logging Cleanup
 * Optimizes console usage for production performance
 */

interface ConsoleMethod {
  log: typeof console.log;
  warn: typeof console.warn;
  info: typeof console.info;
  debug: typeof console.debug;
}

class ConsoleOptimizer {
  private originalMethods: ConsoleMethod;
  private isOptimized = false;

  constructor() {
    this.originalMethods = {
      log: console.log,
      warn: console.warn,
      info: console.info,
      debug: console.debug
    };
  }

  /**
   * Disable non-critical console methods in production
   */
  optimizeForProduction() {
    if (import.meta.env.PROD && !this.isOptimized) {
      console.log = () => {};
      console.warn = () => {};
      console.info = () => {};
      console.debug = () => {};
      this.isOptimized = true;
    }
  }

  /**
   * Restore original console methods (for debugging)
   */
  restore() {
    if (this.isOptimized) {
      console.log = this.originalMethods.log;
      console.warn = this.originalMethods.warn;
      console.info = this.originalMethods.info;
      console.debug = this.originalMethods.debug;
      this.isOptimized = false;
    }
  }

  /**
   * Create a development-only logger
   */
  createDevLogger(prefix: string) {
    return {
      log: (...args: any[]) => {
        if (import.meta.env.DEV) {
          this.originalMethods.log(`[${prefix}]`, ...args);
        }
      },
      warn: (...args: any[]) => {
        if (import.meta.env.DEV) {
          this.originalMethods.warn(`[${prefix}]`, ...args);
        }
      },
      info: (...args: any[]) => {
        if (import.meta.env.DEV) {
          this.originalMethods.info(`[${prefix}]`, ...args);
        }
      },
      error: (...args: any[]) => {
        // Always log errors, even in production
        console.error(`[${prefix}]`, ...args);
      }
    };
  }
}

export const consoleOptimizer = new ConsoleOptimizer();

// Auto-optimize in production
if (typeof window !== 'undefined') {
  consoleOptimizer.optimizeForProduction();
}