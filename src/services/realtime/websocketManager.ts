import { logger } from '@/lib/logger';
import { supabase } from '@/integrations/supabase/client';

/**
 * Enhanced WebSocket manager for real-time updates
 * Provides faster, more efficient real-time communication
 */
export class WebSocketManager {
  private static logger = logger.withContext({ 
    component: 'WebSocketManager', 
    feature: 'websocket-realtime' 
  });

  private static connections = new Map<string, WebSocket>();
  private static subscribers = new Map<string, Set<(data: any) => void>>();
  private static connectionHealthChecks = new Map<string, NodeJS.Timeout>();
  private static reconnectTimeouts = new Map<string, NodeJS.Timeout>();
  private static messageQueues = new Map<string, any[]>();

  /**
   * Enhanced connection management with pooling
   */
  static async getConnection(endpoint: string, userId: string): Promise<WebSocket> {
    const connectionKey = `${endpoint}-${userId}`;
    
    // Reuse existing healthy connection
    const existing = this.connections.get(connectionKey);
    if (existing && existing.readyState === WebSocket.OPEN) {
      return existing;
    }

    // Create new optimized connection
    return this.createConnection(connectionKey, endpoint, userId);
  }

  /**
   * Create optimized WebSocket connection
   */
  private static async createConnection(
    connectionKey: string, 
    endpoint: string, 
    userId: string
  ): Promise<WebSocket> {
    try {
      // Get auth token for secure connection
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        throw new Error('No auth token available for WebSocket connection');
      }

      const wsUrl = `${endpoint}?token=${token}&userId=${userId}`;
      const ws = new WebSocket(wsUrl);

      // Enhanced connection configuration
      ws.binaryType = 'arraybuffer'; // Faster binary data handling

      ws.onopen = () => {
        this.logger.info('WebSocket connection established', { connectionKey });
        this.connections.set(connectionKey, ws);
        this.startHealthCheck(connectionKey);
        this.processQueuedMessages(connectionKey);
      };

      ws.onmessage = (event) => {
        this.handleMessage(connectionKey, event.data);
      };

      ws.onclose = (event) => {
        this.logger.warn('WebSocket connection closed', { 
          connectionKey, 
          code: event.code, 
          reason: event.reason 
        });
        this.handleConnectionClose(connectionKey);
      };

      ws.onerror = (error) => {
        this.logger.error('WebSocket error', { connectionKey, error });
        this.handleConnectionError(connectionKey);
      };

      return ws;
    } catch (error) {
      this.logger.error('Failed to create WebSocket connection', { connectionKey, error });
      throw error;
    }
  }

  /**
   * Subscribe to real-time updates with batching
   */
  static subscribe(
    endpoint: string,
    userId: string,
    callback: (data: any) => void,
    options: {
      batchSize?: number;
      batchDelay?: number;
      compression?: boolean;
    } = {}
  ): () => void {
    const connectionKey = `${endpoint}-${userId}`;
    
    // Initialize subscriber set if needed
    if (!this.subscribers.has(connectionKey)) {
      this.subscribers.set(connectionKey, new Set());
    }

    // Add callback with batching wrapper
    const batchedCallback = this.createBatchedCallback(callback, options);
    this.subscribers.get(connectionKey)!.add(batchedCallback);

    // Ensure connection exists
    this.getConnection(endpoint, userId).catch(error => {
      this.logger.error('Failed to establish connection for subscription', { error });
    });

    // Return unsubscribe function
    return () => {
      const subscriberSet = this.subscribers.get(connectionKey);
      if (subscriberSet) {
        subscriberSet.delete(batchedCallback);
        
        // Clean up connection if no more subscribers
        if (subscriberSet.size === 0) {
          this.closeConnection(connectionKey);
        }
      }
    };
  }

  /**
   * Create batched callback for efficient updates
   */
  private static createBatchedCallback(
    originalCallback: (data: any) => void,
    options: { batchSize?: number; batchDelay?: number; compression?: boolean }
  ) {
    const batchSize = options.batchSize || 10;
    const batchDelay = options.batchDelay || 100;
    
    let batch: any[] = [];
    let timeout: NodeJS.Timeout | null = null;

    const processBatch = () => {
      if (batch.length === 0) return;

      const data = batch.length === 1 ? batch[0] : batch;
      batch = [];
      
      if (timeout) {
        clearTimeout(timeout);
        timeout = null;
      }

      originalCallback(data);
    };

    return (data: any) => {
      batch.push(data);

      if (batch.length >= batchSize) {
        processBatch();
      } else if (!timeout) {
        timeout = setTimeout(processBatch, batchDelay);
      }
    };
  }

  /**
   * Handle incoming messages with decompression
   */
  private static handleMessage(connectionKey: string, data: any) {
    try {
      let parsedData;
      
      // Handle binary compressed data
      if (data instanceof ArrayBuffer) {
        // Decompress if needed (implement compression library)
        const textData = new TextDecoder().decode(data);
        parsedData = JSON.parse(textData);
      } else {
        parsedData = JSON.parse(data);
      }

      // Distribute to all subscribers
      const subscribers = this.subscribers.get(connectionKey);
      if (subscribers) {
        subscribers.forEach(callback => callback(parsedData));
      }
    } catch (error) {
      this.logger.error('Failed to handle WebSocket message', { connectionKey, error });
    }
  }

  /**
   * Enhanced health monitoring
   */
  private static startHealthCheck(connectionKey: string) {
    const interval = setInterval(() => {
      const ws = this.connections.get(connectionKey);
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        this.logger.warn('WebSocket health check failed', { connectionKey });
        clearInterval(interval);
        this.handleConnectionError(connectionKey);
        return;
      }

      // Send ping frame
      try {
        ws.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
      } catch (error) {
        this.logger.error('Failed to send ping', { connectionKey, error });
        this.handleConnectionError(connectionKey);
      }
    }, 30000); // 30 second health check

    this.connectionHealthChecks.set(connectionKey, interval);
  }

  /**
   * Handle connection errors with smart reconnection
   */
  private static handleConnectionError(connectionKey: string) {
    const [endpoint, userId] = connectionKey.split('-');
    
    // Clear existing connection and health check
    this.cleanupConnection(connectionKey);

    // Implement exponential backoff for reconnection
    const attempt = this.getReconnectAttempt(connectionKey);
    const delay = Math.min(1000 * Math.pow(2, attempt), 30000); // Max 30 seconds

    this.logger.info('Scheduling WebSocket reconnection', { connectionKey, delay, attempt });

    const timeout = setTimeout(async () => {
      try {
        await this.createConnection(connectionKey, endpoint, userId);
        this.resetReconnectAttempt(connectionKey);
      } catch (error) {
        this.logger.error('Reconnection failed', { connectionKey, error });
        this.handleConnectionError(connectionKey); // Retry
      }
    }, delay);

    this.reconnectTimeouts.set(connectionKey, timeout);
  }

  /**
   * Handle graceful connection close
   */
  private static handleConnectionClose(connectionKey: string) {
    this.cleanupConnection(connectionKey);
  }

  /**
   * Process queued messages after reconnection
   */
  private static processQueuedMessages(connectionKey: string) {
    const queue = this.messageQueues.get(connectionKey);
    if (!queue || queue.length === 0) return;

    const ws = this.connections.get(connectionKey);
    if (!ws || ws.readyState !== WebSocket.OPEN) return;

    this.logger.info('Processing queued messages', { 
      connectionKey, 
      queueSize: queue.length 
    });

    queue.forEach(message => {
      try {
        ws.send(JSON.stringify(message));
      } catch (error) {
        this.logger.error('Failed to send queued message', { error });
      }
    });

    this.messageQueues.delete(connectionKey);
  }

  /**
   * Clean up connection resources
   */
  private static cleanupConnection(connectionKey: string) {
    // Close WebSocket
    const ws = this.connections.get(connectionKey);
    if (ws) {
      ws.close();
      this.connections.delete(connectionKey);
    }

    // Clear health check
    const healthCheck = this.connectionHealthChecks.get(connectionKey);
    if (healthCheck) {
      clearInterval(healthCheck);
      this.connectionHealthChecks.delete(connectionKey);
    }
  }

  /**
   * Close specific connection
   */
  private static closeConnection(connectionKey: string) {
    this.cleanupConnection(connectionKey);
    
    const timeout = this.reconnectTimeouts.get(connectionKey);
    if (timeout) {
      clearTimeout(timeout);
      this.reconnectTimeouts.delete(connectionKey);
    }
  }

  /**
   * Reconnection attempt tracking
   */
  private static reconnectAttempts = new Map<string, number>();

  private static getReconnectAttempt(connectionKey: string): number {
    return this.reconnectAttempts.get(connectionKey) || 0;
  }

  private static resetReconnectAttempt(connectionKey: string) {
    this.reconnectAttempts.delete(connectionKey);
  }

  /**
   * Global cleanup
   */
  static cleanup() {
    this.logger.info('Cleaning up all WebSocket connections');
    
    // Close all connections
    this.connections.forEach((ws, key) => {
      this.cleanupConnection(key);
    });

    // Clear all timeouts
    this.reconnectTimeouts.forEach(timeout => clearTimeout(timeout));
    
    // Clear all maps
    this.connections.clear();
    this.subscribers.clear();
    this.connectionHealthChecks.clear();
    this.reconnectTimeouts.clear();
    this.messageQueues.clear();
    this.reconnectAttempts.clear();
  }
}