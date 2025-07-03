/**
 * Optimized Supabase client with connection management and reliability features
 */

import { createClient } from '@supabase/supabase-js';
import { ConnectionManager } from '@/lib/reliability/ConnectionManager';
import { RetryService } from '@/lib/reliability/RetryService';
import type { Database } from '@/integrations/supabase/types';

const supabaseUrl = "https://uyjryuopuqgmsvayiccl.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV5anJ5dW9wdXFnbXN2YXlpY2NsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQyNzU2MzgsImV4cCI6MjA1OTg1MTYzOH0.M828t6sJxh4lZAVACqpRosoRvW_VibHDAMSXV-3WrLo";

// Create optimized client with connection pooling
const baseClient = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce'
  },
  global: {
    headers: {
      'Connection': 'keep-alive',
      'Keep-Alive': 'timeout=600'
    }
  },
  db: {
    schema: 'public'
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
});

// Initialize connection manager
const connectionManager = ConnectionManager.getInstance();

/**
 * Enhanced Supabase client with automatic reliability features
 */
class EnhancedSupabaseClient {
  private client = baseClient;

  constructor() {
    // Set up global error handling
    this.setupGlobalErrorHandling();
  }

  private setupGlobalErrorHandling() {
    // Override client methods to add retry logic
    const originalFrom = this.client.from.bind(this.client);
    
    this.client.from = <T extends keyof Database['public']['Tables']>(relation: T) => {
      const table = originalFrom(relation);
      return this.enhanceTableMethods(table);
    };
  }

  private enhanceTableMethods(table: any) {
    // Enhance select method
    const originalSelect = table.select.bind(table);
    table.select = (...args: any[]) => {
      const query = originalSelect(...args);
      return this.enhanceQuery(query);
    };

    // Enhance insert method
    const originalInsert = table.insert.bind(table);
    table.insert = (...args: any[]) => {
      const query = originalInsert(...args);
      return this.enhanceQuery(query);
    };

    // Enhance update method
    const originalUpdate = table.update.bind(table);
    table.update = (...args: any[]) => {
      const query = originalUpdate(...args);
      return this.enhanceQuery(query);
    };

    // Enhance delete method
    const originalDelete = table.delete.bind(table);
    table.delete = (...args: any[]) => {
      const query = originalDelete(...args);
      return this.enhanceQuery(query);
    };

    return table;
  }

  private enhanceQuery(query: any) {
    // Add retry logic to query execution
    const originalThen = query.then?.bind(query);
    
    if (originalThen) {
      query.then = (onFulfilled?: any, onRejected?: any) => {
        const wrappedOperation = async () => {
          // Wait for healthy connection before executing
          await connectionManager.waitForHealthyConnection(5000);
          return originalThen();
        };

        return RetryService.executeWithRetry(wrappedOperation, {
          maxAttempts: 2,
          baseDelay: 500,
          timeoutMs: 15000
        }).then(result => {
          if (result.success) {
            return onFulfilled ? onFulfilled(result.data) : result.data;
          } else {
            return onRejected ? onRejected(result.error) : Promise.reject(result.error);
          }
        });
      };
    }

    return query;
  }

  // Expose all original client methods
  get auth() { return this.client.auth; }
  get storage() { return this.client.storage; }
  get realtime() { return this.client.realtime; }
  get functions() { return this.client.functions; }
  
  from<T extends keyof Database['public']['Tables']>(relation: T) {
    return this.client.from(relation);
  }

  rpc<T extends keyof Database['public']['Functions']>(
    fn: T,
    args?: Database['public']['Functions'][T]['Args']
  ) {
    return this.client.rpc(fn, args);
  }

  channel(name: string, opts?: any) {
    return this.client.channel(name, opts);
  }

  removeChannel(channel: any) {
    return this.client.removeChannel(channel);
  }

  removeAllChannels() {
    return this.client.removeAllChannels();
  }
}

// Export singleton instance
export const optimizedSupabase = new EnhancedSupabaseClient();

// Also export the base client for compatibility
export { baseClient as supabase };