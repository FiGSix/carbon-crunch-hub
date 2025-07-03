/**
 * Enterprise-grade retry service with exponential backoff
 * Provides invisible reliability for all network operations
 */

export interface RetryConfig {
  maxAttempts?: number;
  baseDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  timeoutMs?: number;
  retryCondition?: (error: any) => boolean;
}

export interface RetryResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
  attemptsMade: number;
  totalTime: number;
}

export class RetryService {
  private static readonly DEFAULT_CONFIG: Required<RetryConfig> = {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2,
    timeoutMs: 30000,
    retryCondition: (error: any) => {
      // Retry on network errors, timeout errors, and 5xx server errors
      if (error?.name === 'AbortError') return false; // Don't retry user cancellations
      if (error?.message?.includes('fetch')) return true;
      if (error?.message?.includes('timeout')) return true;
      if (error?.message?.includes('network')) return true;
      if (error?.status >= 500) return true;
      if (error?.code === 'PGRST116') return true; // Supabase connection error
      return false;
    }
  };

  /**
   * Execute operation with automatic retry and exponential backoff
   */
  static async executeWithRetry<T>(
    operation: () => Promise<T>,
    config: RetryConfig = {}
  ): Promise<RetryResult<T>> {
    const finalConfig = { ...this.DEFAULT_CONFIG, ...config };
    const startTime = Date.now();
    let lastError: Error;

    for (let attempt = 1; attempt <= finalConfig.maxAttempts; attempt++) {
      try {
        // Create abort controller for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), finalConfig.timeoutMs);

        // Execute operation with timeout
        const result = await Promise.race([
          operation(),
          new Promise<never>((_, reject) => {
            controller.signal.addEventListener('abort', () => {
              reject(new Error(`Operation timed out after ${finalConfig.timeoutMs}ms`));
            });
          })
        ]);

        clearTimeout(timeoutId);

        return {
          success: true,
          data: result,
          attemptsMade: attempt,
          totalTime: Date.now() - startTime
        };

      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        // Check if we should retry
        if (attempt === finalConfig.maxAttempts || !finalConfig.retryCondition(error)) {
          break;
        }

        // Calculate delay with exponential backoff and jitter
        const baseDelay = Math.min(
          finalConfig.baseDelay * Math.pow(finalConfig.backoffMultiplier, attempt - 1),
          finalConfig.maxDelay
        );
        const jitter = Math.random() * 0.1 * baseDelay; // Add 10% jitter
        const delay = baseDelay + jitter;

        console.warn(`Retry attempt ${attempt}/${finalConfig.maxAttempts} failed:`, error.message, `Retrying in ${Math.round(delay)}ms`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    return {
      success: false,
      error: lastError!,
      attemptsMade: finalConfig.maxAttempts,
      totalTime: Date.now() - startTime
    };
  }

  /**
   * Wrap any async function with retry logic
   */
  static withRetry<T extends any[], R>(
    fn: (...args: T) => Promise<R>,
    config: RetryConfig = {}
  ) {
    return async (...args: T): Promise<R> => {
      const result = await this.executeWithRetry(() => fn(...args), config);
      
      if (!result.success) {
        throw result.error;
      }
      
      return result.data!;
    };
  }
}