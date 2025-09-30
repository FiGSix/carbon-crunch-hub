import React, { useEffect, useCallback, useRef } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { devLogger } from '@/lib/performance/ConsoleReplacementUtility';

interface UseAuthReliabilityProps {
  session: Session | null;
  isInitialized: boolean;
  onAuthStateChange: (session: Session | null) => void;
  onError: (error: string) => void;
}

/**
 * Provides authentication reliability features including:
 * - Connection monitoring
 * - Automatic session recovery
 * - Error handling and retries
 */
export function useAuthReliability({ 
  session, 
  isInitialized, 
  onAuthStateChange, 
  onError 
}: UseAuthReliabilityProps) {
  
  const retryAttempts = useRef(0);
  const maxRetries = 3;
  const connectionCheckInterval = useRef<NodeJS.Timeout>();

  const checkConnection = useCallback(async () => {
    try {
      // Simple health check query
      const { error } = await supabase
        .from('profiles')
        .select('id')
        .limit(1);

      if (error) {
        devLogger.auth.warn('🔌 Database connection issue detected:', error.message);
        
        if (retryAttempts.current < maxRetries) {
          retryAttempts.current++;
          devLogger.auth.info(`🔄 Attempting connection recovery (${retryAttempts.current}/${maxRetries})`);
          
          // Try to refresh session
          const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
          
          if (!refreshError && refreshData.session) {
            devLogger.auth.info('✅ Connection recovered via session refresh');
            retryAttempts.current = 0;
            onAuthStateChange(refreshData.session);
          }
        } else {
          onError('Connection to database lost. Please refresh the page.');
          retryAttempts.current = 0;
        }
      } else {
        // Connection is good, reset retry counter
        retryAttempts.current = 0;
      }
    } catch (error) {
      devLogger.auth.error('💥 Connection check failed:', error);
    }
  }, [onAuthStateChange, onError]);

  const recoverSession = useCallback(async () => {
    devLogger.auth.info('🔄 Attempting session recovery');

    try {
      // First try to get existing session
      const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        devLogger.auth.warn('⚠️ Error getting session during recovery:', sessionError.message);
        return false;
      }

      if (currentSession) {
        // Validate the session is actually working
        const { error: testError } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', currentSession.user.id)
          .limit(1);

        if (!testError) {
          devLogger.auth.info('✅ Session recovered successfully');
          onAuthStateChange(currentSession);
          return true;
        }
      }

      // If no valid session, try refresh
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
      
      if (!refreshError && refreshData.session) {
        devLogger.auth.info('✅ Session recovered via refresh');
        onAuthStateChange(refreshData.session);
        return true;
      }

      return false;
    } catch (error) {
      devLogger.auth.error('💥 Session recovery failed:', error);
      return false;
    }
  }, [onAuthStateChange]);

  // Start connection monitoring when authenticated and initialized
  useEffect(() => {
    if (!session || !isInitialized) {
      if (connectionCheckInterval.current) {
        clearInterval(connectionCheckInterval.current);
        connectionCheckInterval.current = undefined;
      }
      return;
    }

    devLogger.auth.info('🔌 Starting connection monitoring');

    connectionCheckInterval.current = setInterval(checkConnection, 30000); // Check every 30 seconds

    return () => {
      if (connectionCheckInterval.current) {
        clearInterval(connectionCheckInterval.current);
        connectionCheckInterval.current = undefined;
      }
    };
  }, [session, isInitialized, checkConnection]);

  // Listen for network events
  useEffect(() => {
    const handleOnline = () => {
      devLogger.auth.info('🌐 Network reconnected, attempting session recovery');
      recoverSession();
    };

    const handleOffline = () => {
      devLogger.auth.info('🌐 Network disconnected');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [recoverSession]);

  return { recoverSession, checkConnection };
}