import { useEffect, useRef, useState } from 'react';
import { EnhancedRealtimeService } from '@/services/realtime/enhancedRealtimeService';
import { OptimizedRealtimeService } from '@/services/optimizedRealtimeService';
import { logger } from '@/lib/logger';
import { useAuth } from '@/contexts/auth';

interface UseEnhancedRealtimeProps {
  type: 'proposals' | 'notifications' | 'agents';
  onUpdate: (payload: any) => void;
  options?: {
    enableWebSocket?: boolean;
    enableBatching?: boolean;
    enableCompression?: boolean;
    fallbackToSupabase?: boolean;
  };
}

interface RealtimeMetrics {
  connectionType: 'websocket' | 'supabase';
  latency: number;
  updateCount: number;
  errorCount: number;
  lastUpdate: Date | null;
}

/**
 * Enhanced real-time hook with automatic fallback and performance monitoring
 */
export function useEnhancedRealtime({
  type,
  onUpdate,
  options = {}
}: UseEnhancedRealtimeProps) {
  const { user } = useAuth();
  const {
    enableWebSocket = true,
    enableBatching = true,
    enableCompression = true,
    fallbackToSupabase = true
  } = options;

  const [metrics, setMetrics] = useState<RealtimeMetrics>({
    connectionType: 'supabase',
    latency: 0,
    updateCount: 0,
    errorCount: 0,
    lastUpdate: null
  });

  const subscriptionRef = useRef<(() => void) | null>(null);
  const startTimeRef = useRef<number>(0);
  const componentLogger = logger.withContext({ 
    component: 'useEnhancedRealtime',
    type,
    userId: user?.id 
  });

  // Enhanced update handler with metrics tracking
  const handleUpdate = (payload: any) => {
    const now = Date.now();
    const latency = startTimeRef.current ? now - startTimeRef.current : 0;

    setMetrics(prev => ({
      ...prev,
      latency,
      updateCount: prev.updateCount + 1,
      lastUpdate: new Date()
    }));

    componentLogger.info('Real-time update received', { 
      type, 
      eventType: payload.eventType,
      latency 
    });

    onUpdate(payload);
  };

  // Enhanced error handler
  const handleError = (error: any) => {
    setMetrics(prev => ({
      ...prev,
      errorCount: prev.errorCount + 1
    }));

    componentLogger.error('Real-time error', { type, error });
  };

  useEffect(() => {
    if (!user) return;

    let cleanup: (() => void) | null = null;
    startTimeRef.current = Date.now();

    const setupSubscription = async () => {
      try {
        // Try enhanced WebSocket service first
        if (enableWebSocket) {
          componentLogger.info('Setting up WebSocket subscription', { type });

          if (type === 'proposals') {
            cleanup = EnhancedRealtimeService.subscribeToProposalChanges(
              user.id,
              user.role || 'client',
              handleUpdate,
              {
                useWebSocket: true,
                batchUpdates: enableBatching,
                compression: enableCompression
              }
            );
          } else if (type === 'notifications') {
            cleanup = EnhancedRealtimeService.subscribeToNotificationChanges(
              user.id,
              handleUpdate,
              {
                useWebSocket: true,
                batchUpdates: enableBatching
              }
            );
          } else if (type === 'agents') {
            cleanup = EnhancedRealtimeService.subscribeToAgentChanges(
              handleUpdate,
              {
                useWebSocket: true,
                intelligentFiltering: true
              }
            );
          }

          setMetrics(prev => ({ ...prev, connectionType: 'websocket' }));
          componentLogger.info('WebSocket subscription established', { type });

        } else if (fallbackToSupabase) {
          // Use optimized Supabase fallback
          setupSupabaseFallback();
        }

      } catch (error) {
        handleError(error);
        
        if (fallbackToSupabase) {
          componentLogger.warn('WebSocket failed, falling back to Supabase', { error });
          setupSupabaseFallback();
        }
      }
    };

    const setupSupabaseFallback = () => {
      componentLogger.info('Setting up Supabase fallback subscription', { type });

      if (type === 'proposals') {
        cleanup = OptimizedRealtimeService.subscribeToProposalChanges(
          user.id,
          user.role || 'client',
          handleUpdate
        );
      } else if (type === 'notifications') {
        cleanup = OptimizedRealtimeService.subscribeToNotificationChanges(
          user.id,
          handleUpdate
        );
      } else if (type === 'agents') {
        cleanup = OptimizedRealtimeService.subscribeToAgentChanges(handleUpdate);
      }

      setMetrics(prev => ({ ...prev, connectionType: 'supabase' }));
    };

    setupSubscription();
    subscriptionRef.current = cleanup;

    return () => {
      if (cleanup) {
        cleanup();
      }
    };
  }, [user, type, enableWebSocket, enableBatching, enableCompression, fallbackToSupabase]);

  // Performance monitoring
  const getPerformanceReport = () => {
    const errorRate = metrics.updateCount > 0 ? metrics.errorCount / metrics.updateCount : 0;
    
    return {
      ...metrics,
      averageLatency: metrics.updateCount > 0 ? metrics.latency / metrics.updateCount : 0,
      errorRate,
      uptime: metrics.lastUpdate ? Date.now() - metrics.lastUpdate.getTime() : 0
    };
  };

  const performanceReport = getPerformanceReport();
  
  return {
    metrics,
    getPerformanceReport,
    connectionType: metrics.connectionType,
    isHealthy: performanceReport.errorRate < 0.1 && metrics.latency < 1000
  };
}