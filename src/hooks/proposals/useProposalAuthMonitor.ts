import { useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/auth';
import { useToast } from '@/hooks/use-toast';
import { OptimizedAuthEventService } from '@/services/auth/OptimizedAuthEventService';

/**
 * Phase 4: Monitor auth state during proposal generation to prevent mid-flow logouts
 */
export function useProposalAuthMonitor() {
  const { user, session, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const lastCheckRef = useRef<number>(0);
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const validateProposalSession = useCallback(async () => {
    if (!session || !user) {
      OptimizedAuthEventService.logAuthEvent('warn', 'No session during proposal generation', {
        operation: 'proposal_generation',
        userId: user?.id
      });
      return false;
    }

    // Check if session is nearing expiry (within 5 minutes)
    const expiresAt = session.expires_at;
    if (expiresAt) {
      const timeUntilExpiry = (expiresAt * 1000) - Date.now();
      if (timeUntilExpiry < 5 * 60 * 1000) { // 5 minutes
        OptimizedAuthEventService.logAuthEvent('warn', 'Session nearing expiry during proposal generation', {
          operation: 'proposal_generation',
          userId: user.id,
          timeUntilExpiry
        });
        
        // Show warning to user
        toast({
          title: "Session Expiring Soon",
          description: "Your session will expire soon. Please save your progress.",
          variant: "destructive",
        });
        
        return false;
      }
    }

    return true;
  }, [session, user, toast]);

  const startMonitoring = useCallback(() => {
    if (!isAuthenticated) return;

    OptimizedAuthEventService.logAuthEvent('info', 'Starting proposal auth monitoring', {
      operation: 'proposal_generation',
      userId: user?.id
    });

    // Clear any existing interval
    if (checkIntervalRef.current) {
      clearInterval(checkIntervalRef.current);
    }

    // Check session every 2 minutes during proposal generation
    checkIntervalRef.current = setInterval(() => {
      validateProposalSession();
    }, 2 * 60 * 1000);

    // Initial check
    validateProposalSession();
  }, [isAuthenticated, user?.id, validateProposalSession]);

  const stopMonitoring = useCallback(() => {
    OptimizedAuthEventService.logAuthEvent('info', 'Stopping proposal auth monitoring', {
      operation: 'proposal_generation',
      userId: user?.id
    });

    if (checkIntervalRef.current) {
      clearInterval(checkIntervalRef.current);
      checkIntervalRef.current = null;
    }
  }, [user?.id]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
    };
  }, []);

  return {
    startMonitoring,
    stopMonitoring,
    validateProposalSession
  };
}