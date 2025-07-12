import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EnhancedRealtimeService } from '@/services/realtime/enhancedRealtimeService';
import { useAuth } from '@/contexts/auth';
import { 
  Activity, 
  Wifi, 
  WifiOff, 
  Clock, 
  AlertCircle,
  CheckCircle2,
  BarChart3 
} from 'lucide-react';

interface PerformanceMetrics {
  connectionType: 'websocket' | 'supabase';
  latency: number;
  updateCount: number;
  errorCount: number;
  errorRate: number;
  lastUpdate: Date | null;
  uptime: number;
}

/**
 * Real-time performance monitoring component
 * Shows connection status, metrics, and allows switching connection types
 */
export function RealtimePerformanceMonitor() {
  const { userRole } = useAuth();
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  // Only show to admins
  if (userRole !== 'admin') {
    return null;
  }

  useEffect(() => {
    const interval = setInterval(() => {
      try {
        const currentMetrics = EnhancedRealtimeService.getPerformanceMetrics();
        // Mock metrics for now - would be populated by actual service
        setMetrics({
          connectionType: 'websocket',
          latency: 150,
          updateCount: 0,
          errorCount: 0,
          errorRate: 0,
          lastUpdate: new Date(),
          uptime: 60000
        });
      } catch (error) {
        console.warn('Failed to get performance metrics:', error);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const getConnectionStatus = () => {
    if (!metrics) return { status: 'unknown', color: 'gray' };
    
    if (metrics.errorRate > 0.1) {
      return { status: 'unhealthy', color: 'red' };
    }
    
    if (metrics.latency > 1000) {
      return { status: 'slow', color: 'yellow' };
    }
    
    return { status: 'healthy', color: 'green' };
  };

  const formatLatency = (latency: number) => {
    if (latency < 1000) return `${latency}ms`;
    return `${(latency / 1000).toFixed(1)}s`;
  };

  const formatUptime = (uptime: number) => {
    const seconds = Math.floor(uptime / 1000);
    if (seconds < 60) return `${seconds}s`;
    
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m`;
  };

  if (!isVisible) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 right-4 z-50"
      >
        <Activity className="h-4 w-4 mr-2" />
        Real-time Monitor
      </Button>
    );
  }

  const connectionStatus = getConnectionStatus();

  return (
    <Card className="fixed bottom-4 right-4 w-80 z-50 shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">
            Real-time Performance
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsVisible(false)}
          >
            ×
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {/* Connection Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {metrics?.connectionType === 'websocket' ? (
              <Wifi className="h-4 w-4 text-blue-500" />
            ) : (
              <WifiOff className="h-4 w-4 text-gray-500" />
            )}
            <span className="text-sm font-medium">
              {metrics?.connectionType === 'websocket' ? 'WebSocket' : 'Supabase'}
            </span>
          </div>
          
          <Badge 
            variant={
              connectionStatus.color === 'green' ? 'default' :
              connectionStatus.color === 'yellow' ? 'secondary' : 'destructive'
            }
          >
            {connectionStatus.status}
          </Badge>
        </div>

        {metrics && (
          <>
            {/* Latency */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-gray-400" />
                <span className="text-sm">Latency</span>
              </div>
              <span className="text-sm font-mono">
                {formatLatency(metrics.latency)}
              </span>
            </div>

            {/* Update Count */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <BarChart3 className="h-4 w-4 text-gray-400" />
                <span className="text-sm">Updates</span>
              </div>
              <span className="text-sm font-mono">
                {metrics.updateCount}
              </span>
            </div>

            {/* Error Rate */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {metrics.errorRate > 0.1 ? (
                  <AlertCircle className="h-4 w-4 text-red-500" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                )}
                <span className="text-sm">Error Rate</span>
              </div>
              <span className="text-sm font-mono">
                {(metrics.errorRate * 100).toFixed(1)}%
              </span>
            </div>

            {/* Uptime */}
            {metrics.uptime > 0 && (
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Activity className="h-4 w-4 text-gray-400" />
                  <span className="text-sm">Uptime</span>
                </div>
                <span className="text-sm font-mono">
                  {formatUptime(metrics.uptime)}
                </span>
              </div>
            )}

            {/* Last Update */}
            {metrics.lastUpdate && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Last Update</span>
                <span className="text-xs font-mono text-gray-600">
                  {metrics.lastUpdate.toLocaleTimeString()}
                </span>
              </div>
            )}
          </>
        )}

        {/* Actions */}
        <div className="pt-2 border-t space-y-2">
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => {
              EnhancedRealtimeService.cleanup();
              window.location.reload();
            }}
          >
            Reset Connections
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}