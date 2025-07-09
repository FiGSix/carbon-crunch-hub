import React, { useState, useEffect } from 'react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, XCircle, AlertTriangle, RefreshCw, Activity, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/auth";
import { RoleValidator } from "@/services/unified/utils/RoleValidator";

interface GoogleMapsHealthMonitorProps {
  autoRefresh?: boolean;
  refreshInterval?: number; // in seconds
  showDetails?: boolean;
  compact?: boolean;
}

interface HealthStatus {
  healthy: boolean;
  lastCheck: string;
  apiKeyValid: boolean;
  autocompleteWorking: boolean;
  detailsWorking: boolean;
  error?: string;
}

export function GoogleMapsHealthMonitor({ 
  autoRefresh = true, 
  refreshInterval = 300, // 5 minutes
  showDetails = false,
  compact = false 
}: GoogleMapsHealthMonitorProps) {
  const { profile } = useAuth();
  
  // Check admin access
  if (!RoleValidator.isAdmin(profile?.role)) {
    return (
      <Alert>
        <ShieldCheck className="h-4 w-4" />
        <AlertDescription>
          System monitoring is restricted to administrators.
        </AlertDescription>
      </Alert>
    );
  }
  const [healthStatus, setHealthStatus] = useState<HealthStatus>({
    healthy: false,
    lastCheck: '',
    apiKeyValid: false,
    autocompleteWorking: false,
    detailsWorking: false
  });
  const [isChecking, setIsChecking] = useState(false);
  const [nextCheck, setNextCheck] = useState<number>(refreshInterval);

  const checkHealth = async (silent = false) => {
    if (!silent) setIsChecking(true);
    
    try {
      console.log('🔍 Health monitor checking Google Maps status...');
      
      const { data, error } = await supabase.functions.invoke('google-maps-health-check');
      
      if (error) {
        console.error('❌ Health monitor error:', error);
        setHealthStatus({
          healthy: false,
          lastCheck: new Date().toISOString(),
          apiKeyValid: false,
          autocompleteWorking: false,
          detailsWorking: false,
          error: error.message
        });
        return;
      }
      
      const newStatus: HealthStatus = {
        healthy: data.overall.healthy,
        lastCheck: data.timestamp,
        apiKeyValid: data.apiKeyValidation.present && data.apiKeyValidation.format === 'valid',
        autocompleteWorking: data.autocompleteTest.success,
        detailsWorking: data.detailsTest.success
      };
      
      console.log('✅ Health monitor update:', newStatus);
      setHealthStatus(newStatus);
      
    } catch (error) {
      console.error('💥 Health monitor error:', error);
      setHealthStatus({
        healthy: false,
        lastCheck: new Date().toISOString(),
        apiKeyValid: false,
        autocompleteWorking: false,
        detailsWorking: false,
        error: 'Network error'
      });
    } finally {
      if (!silent) setIsChecking(false);
    }
  };

  useEffect(() => {
    // Initial check
    checkHealth(true);
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;

    const timer = setInterval(() => {
      setNextCheck(prev => {
        if (prev <= 1) {
          checkHealth(true);
          return refreshInterval;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [autoRefresh, refreshInterval]);

  const getStatusIcon = () => {
    if (isChecking) {
      return <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />;
    }
    
    if (healthStatus.healthy) {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
    
    if (healthStatus.error) {
      return <XCircle className="h-4 w-4 text-red-500" />;
    }
    
    return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
  };

  const getStatusBadge = () => {
    if (isChecking) {
      return <Badge variant="secondary">Checking...</Badge>;
    }
    
    if (healthStatus.healthy) {
      return <Badge variant="default">Healthy</Badge>;
    }
    
    return <Badge variant="destructive">Issues</Badge>;
  };

  const getDetailedStatus = () => {
    return (
      <div className="text-xs space-y-1">
        <div className="flex items-center gap-2">
          <span>API Key:</span>
          {healthStatus.apiKeyValid ? (
            <CheckCircle className="h-3 w-3 text-green-500" />
          ) : (
            <XCircle className="h-3 w-3 text-red-500" />
          )}
        </div>
        <div className="flex items-center gap-2">
          <span>Autocomplete:</span>
          {healthStatus.autocompleteWorking ? (
            <CheckCircle className="h-3 w-3 text-green-500" />
          ) : (
            <XCircle className="h-3 w-3 text-red-500" />
          )}
        </div>
        <div className="flex items-center gap-2">
          <span>Place Details:</span>
          {healthStatus.detailsWorking ? (
            <CheckCircle className="h-3 w-3 text-green-500" />
          ) : (
            <XCircle className="h-3 w-3 text-red-500" />
          )}
        </div>
        {healthStatus.lastCheck && (
          <div className="text-muted-foreground">
            Last: {new Date(healthStatus.lastCheck).toLocaleTimeString()}
          </div>
        )}
        {autoRefresh && nextCheck > 0 && (
          <div className="text-muted-foreground">
            Next: {nextCheck}s
          </div>
        )}
      </div>
    );
  };

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1">
              {getStatusIcon()}
              {getStatusBadge()}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <div className="space-y-2">
              <p className="font-medium">Google Maps Status</p>
              {getDetailedStatus()}
              {healthStatus.error && (
                <p className="text-red-500 text-xs">{healthStatus.error}</p>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <div className="flex items-center justify-between p-3 border rounded-lg bg-card">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          {getStatusIcon()}
          <span className="font-medium">Google Maps API</span>
          {getStatusBadge()}
        </div>
        
        {showDetails && (
          <div className="ml-4">
            {getDetailedStatus()}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        {autoRefresh && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Activity className="h-3 w-3" />
            <span>Auto: {nextCheck}s</span>
          </div>
        )}
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => checkHealth()}
          disabled={isChecking}
        >
          {isChecking ? (
            <RefreshCw className="h-3 w-3 animate-spin" />
          ) : (
            <RefreshCw className="h-3 w-3" />
          )}
        </Button>
      </div>
    </div>
  );
}