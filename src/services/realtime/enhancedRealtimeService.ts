import { WebSocketManager } from './websocketManager';
import { BaseSubscriptionManager } from './baseSubscriptionManager';
import { DebounceUtils } from './debounceUtils';
import { logger } from '@/lib/logger';
import { supabase } from '@/integrations/supabase/client';

/**
 * Enhanced real-time service with WebSocket optimization
 * Provides faster updates and reduced server load
 */
export class EnhancedRealtimeService extends BaseSubscriptionManager {
  protected static logger = logger.withContext({ 
    component: 'EnhancedRealtimeService', 
    feature: 'enhanced-realtime' 
  });

  private static readonly WS_ENDPOINTS = {
    proposals: '/realtime/proposals',
    notifications: '/realtime/notifications',
    agents: '/realtime/agents'
  };

  /**
   * Enhanced proposal subscriptions with WebSocket fallback
   */
  static subscribeToProposalChanges(
    userId: string, 
    userRole: string, 
    onUpdate: (payload: any) => void,
    options: {
      useWebSocket?: boolean;
      batchUpdates?: boolean;
      compression?: boolean;
    } = {}
  ) {
    const { useWebSocket = true, batchUpdates = true, compression = true } = options;
    const channelKey = `proposals-enhanced-${userId}-${userRole}`;

    this.logger.info('Setting up enhanced proposal subscription', { 
      userId, 
      userRole, 
      useWebSocket,
      batchUpdates 
    });

    // Try WebSocket first for better performance
    if (useWebSocket) {
      return this.setupWebSocketSubscription(
        'proposals',
        channelKey,
        userId,
        userRole,
        onUpdate,
        { batchUpdates, compression }
      );
    }

    // Fallback to optimized Supabase real-time
    return this.setupSupabaseSubscription(
      channelKey,
      userId,
      userRole,
      onUpdate
    );
  }

  /**
   * Enhanced notification subscriptions
   */
  static subscribeToNotificationChanges(
    userId: string, 
    onUpdate: (payload: any) => void,
    options: {
      useWebSocket?: boolean;
      batchUpdates?: boolean;
    } = {}
  ) {
    const { useWebSocket = true, batchUpdates = true } = options;
    const channelKey = `notifications-enhanced-${userId}`;

    this.logger.info('Setting up enhanced notification subscription', { 
      userId, 
      useWebSocket 
    });

    if (useWebSocket) {
      return this.setupWebSocketSubscription(
        'notifications',
        channelKey,
        userId,
        'client',
        onUpdate,
        { batchUpdates }
      );
    }

    return this.setupSupabaseNotificationSubscription(channelKey, userId, onUpdate);
  }

  /**
   * Enhanced agent management subscriptions
   */
  static subscribeToAgentChanges(
    onUpdate: (payload: any) => void,
    options: {
      useWebSocket?: boolean;
      intelligentFiltering?: boolean;
    } = {}
  ) {
    const { useWebSocket = true, intelligentFiltering = true } = options;
    const channelKey = 'agents-enhanced-management';

    this.logger.info('Setting up enhanced agent subscription', { 
      useWebSocket,
      intelligentFiltering 
    });

    if (useWebSocket) {
      return this.setupWebSocketSubscription(
        'agents',
        channelKey,
        'system',
        'admin',
        onUpdate,
        { intelligentFiltering }
      );
    }

    return this.setupSupabaseAgentSubscription(channelKey, onUpdate);
  }

  /**
   * Setup WebSocket-based subscription with smart fallback
   */
  private static setupWebSocketSubscription(
    endpoint: keyof typeof EnhancedRealtimeService.WS_ENDPOINTS,
    channelKey: string,
    userId: string,
    userRole: string,
    onUpdate: (payload: any) => void,
    options: {
      batchUpdates?: boolean;
      compression?: boolean;
      intelligentFiltering?: boolean;
    } = {}
  ) {
    const wsEndpoint = this.WS_ENDPOINTS[endpoint];
    
    try {
      // Setup WebSocket subscription with enhanced options
      const unsubscribeWS = WebSocketManager.subscribe(
        wsEndpoint,
        userId,
        (data) => {
          // Apply intelligent filtering if enabled
          if (options.intelligentFiltering && !this.shouldProcessUpdate(data, endpoint)) {
            return;
          }

          // Enhanced debouncing for batch updates
          if (options.batchUpdates) {
            DebounceUtils.debounceUpdate(
              `${channelKey}-enhanced`,
              onUpdate,
              data,
              this.getOptimalDebounceDelay(endpoint)
            );
          } else {
            onUpdate(data);
          }
        },
        {
          batchSize: 5,
          batchDelay: 150,
          compression: options.compression
        }
      );

      this.logger.info('WebSocket subscription established', { channelKey, endpoint });
      return unsubscribeWS;

    } catch (error) {
      this.logger.warn('WebSocket setup failed, falling back to Supabase', { 
        channelKey, 
        error 
      });

      // Smart fallback to Supabase real-time
      return this.setupSupabaseFallback(channelKey, userId, userRole, onUpdate, endpoint);
    }
  }

  /**
   * Intelligent update filtering
   */
  private static shouldProcessUpdate(data: any, endpoint: string): boolean {
    switch (endpoint) {
      case 'proposals':
        return this.isSignificantProposalChange(data);
      case 'notifications':
        return true; // Always process notifications
      case 'agents':
        return this.isSignificantAgentChange(data);
      default:
        return true;
    }
  }

  /**
   * Check if proposal change is significant
   */
  private static isSignificantProposalChange(data: any): boolean {
    if (data.eventType === 'INSERT' || data.eventType === 'DELETE') {
      return true;
    }

    const significantFields = [
      'status', 'title', 'signed_at', 'archived_at', 'deleted_at',
      'carbon_credits', 'system_size_kwp', 'invitation_sent_at'
    ];

    return significantFields.some(field => 
      data.old?.[field] !== data.new?.[field]
    );
  }

  /**
   * Check if agent change is significant
   */
  private static isSignificantAgentChange(data: any): boolean {
    if (data.eventType === 'INSERT' || data.eventType === 'DELETE') {
      return true;
    }

    const significantFields = [
      'agent_status', 'commission_override', 'first_name', 
      'last_name', 'access_level', 'last_active_at'
    ];

    return significantFields.some(field => 
      data.old?.[field] !== data.new?.[field]
    );
  }

  /**
   * Get optimal debounce delay for different endpoints
   */
  private static getOptimalDebounceDelay(endpoint: string): number {
    switch (endpoint) {
      case 'proposals':
        return 300; // 300ms for proposals
      case 'notifications':
        return 1000; // 1s for notifications
      case 'agents':
        return 500; // 500ms for agent changes
      default:
        return 500;
    }
  }

  /**
   * Supabase fallback implementations
   */
  private static setupSupabaseFallback(
    channelKey: string,
    userId: string,
    userRole: string,
    onUpdate: (payload: any) => void,
    endpoint: string
  ) {
    switch (endpoint) {
      case 'proposals':
        return this.setupSupabaseSubscription(channelKey, userId, userRole, onUpdate);
      case 'notifications':
        return this.setupSupabaseNotificationSubscription(channelKey, userId, onUpdate);
      case 'agents':
        return this.setupSupabaseAgentSubscription(channelKey, onUpdate);
      default:
        throw new Error(`Unknown endpoint: ${endpoint}`);
    }
  }

  /**
   * Optimized Supabase proposal subscription
   */
  private static setupSupabaseSubscription(
    channelKey: string,
    userId: string,
    userRole: string,
    onUpdate: (payload: any) => void
  ) {
    return this.createOrReuseSubscription(channelKey, () => {
      return supabase
        .channel(channelKey)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'proposals',
            filter: userRole === 'agent' 
              ? `agent_id=eq.${userId}` 
              : userRole === 'client'
              ? `or(client_id.eq.${userId},client_reference_id.eq.${userId})`
              : undefined
          },
          (payload) => {
            if (this.isSignificantProposalChange(payload)) {
              DebounceUtils.debounceUpdate(channelKey, onUpdate, payload, 300);
            }
          }
        )
        .subscribe();
    });
  }

  /**
   * Optimized Supabase notification subscription
   */
  private static setupSupabaseNotificationSubscription(
    channelKey: string,
    userId: string,
    onUpdate: (payload: any) => void
  ) {
    return this.createOrReuseSubscription(channelKey, () => {
      return supabase
        .channel(channelKey)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${userId}`
          },
          (payload) => {
            DebounceUtils.debounceUpdate(channelKey, onUpdate, payload, 1000);
          }
        )
        .subscribe();
    });
  }

  /**
   * Optimized Supabase agent subscription
   */
  private static setupSupabaseAgentSubscription(
    channelKey: string,
    onUpdate: (payload: any) => void
  ) {
    return this.createOrReuseSubscription(channelKey, () => {
      return supabase
        .channel(channelKey)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'profiles',
            filter: 'role=eq.agent'
          },
          (payload) => {
            if (this.isSignificantAgentChange(payload)) {
              DebounceUtils.debounceUpdate(channelKey, onUpdate, payload, 500);
            }
          }
        )
        .subscribe();
    });
  }

  /**
   * Performance monitoring and metrics
   */
  static getPerformanceMetrics() {
    return {
      activeConnections: WebSocketManager.constructor.name, // Access connection count
      subscriptionCount: this.activeChannels.size,
      memoryUsage: process.memoryUsage?.() || 'N/A'
    };
  }

  /**
   * Enhanced cleanup with performance tracking
   */
  static cleanup() {
    this.logger.info('Cleaning up enhanced real-time service');
    
    // Cleanup WebSocket connections
    WebSocketManager.cleanup();
    
    // Cleanup debounced updates
    DebounceUtils.clearAllDebounces();
    
    // Cleanup base subscriptions
    super.cleanup();
  }
}