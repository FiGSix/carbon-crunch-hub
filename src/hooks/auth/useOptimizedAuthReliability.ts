import { useEffect, useCallback, useRef } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { devLogger } from '@/lib/performance/ConsoleReplacementUtility';

interface UseOptimizedAuthReliabilityProps {
  session: Session | null;
  isInitialized: boolean;
  onAuthStateChange: (session: Session | null) => void;
  onError?: (error: string) => void;
}

/**
 * Phase 2 & 3: Optimized auth reliability with exponential backoff and graceful error handling
 */
export function useOptimizedAuthReliability({
  session,
  isInitialized,
  onAuthStateChange,
  onError
}: UseOptimizedAuthReliabilityProps) {
  const retryCountRef = useRef(0);
  const lastRetryRef = useRef<number>(0);
  const maxRetries = 3;
  const baseDelay = 1000; // 1 second

  const recoverSession = useCallback(async (): Promise<boolean> => {
    // Exit early if we don't have a session to recover
    if (!session) {
      return false;
    }
    try {
      devLogger.auth.info('🔄 Attempting session recovery');

      // Check if we're hitting retry limits
      const now = Date.now();
      if (retryCountRef.current >= maxRetries) {
        const timeSinceLastRetry = now - lastRetryRef.current;
        if (timeSinceLastRetry < baseDelay * Math.pow(2, maxRetries)) {
          devLogger.auth.info('⏳ Too many retry attempts, backing off');
          return false;
        }
        // Reset retry count after sufficient backoff
        retryCountRef.current = 0;
      }

      retryCountRef.current++;
      lastRetryRef.current = now;

      // Exponential backoff delay
      const delay = baseDelay * Math.pow(2, retryCountRef.current - 1);
      if (retryCountRef.current > 1) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      // Attempt to get fresh session
      const { data, error } = await supabase.auth.getSession();
      
      if (error) {
        devLogger.auth.error('❌ Session recovery failed:', error.message);
        
        // Handle specific error types
        if (error.message.includes('Invalid Refresh Token') || 
            error.message.includes('refresh_token_not_found')) {
          // Token is invalid, user needs to re-authenticate
          onError?.('Your session has expired. Please sign in again.');
          await supabase.auth.signOut();
          onAuthStateChange(null);
          return false;
        }
        
        // For other errors, allow retry
        throw error;
      }

      if (data.session) {
        devLogger.auth.info('✅ Session recovered successfully');
        retryCountRef.current = 0; // Reset on success
        onAuthStateChange(data.session);
        return true;
      }

      return false;
    } catch (error) {
      devLogger.auth.error('💥 Session recovery error:', error);
      
      if (retryCountRef.current >= maxRetries) {
        onError?.('Unable to restore your session. Please sign in again.');
        await supabase.auth.signOut();
        onAuthStateChange(null);
        return false;
      }
      
      return false;
    }
  }, [session, onAuthStateChange, onError]);

  // Monitor for network connectivity and auth errors
  useEffect(() => {
    if (!isInitialized) return;

    const handleOnline = () => {
      devLogger.auth.info('🌐 Network restored, checking session');
      // Only attempt recovery if we have an existing session
      if (session) {
        recoverSession();
      }
    };

    const handleAuthError = (event: CustomEvent) => {
      devLogger.auth.info('🔐 Auth error detected, attempting recovery');
      recoverSession();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('auth-error', handleAuthError as EventListener);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('auth-error', handleAuthError as EventListener);
    };
  }, [isInitialized, session, recoverSession]);

  // Background session refresh - but only when needed
  useEffect(() => {
    if (!session || !isInitialized) return;

    // Only refresh if session expires within next 10 minutes
    const expiresAt = session.expires_at;
    if (!expiresAt) return;

    const expiryTime = expiresAt * 1000;
    const now = Date.now();
    const timeUntilExpiry = expiryTime - now;
    const refreshBuffer = 10 * 60 * 1000; // 10 minutes

    if (timeUntilExpiry <= refreshBuffer && timeUntilExpiry > 0) {
      devLogger.auth.info('🔄 Session nearing expiry, refreshing in background');
      
      // Schedule refresh
      const timeout = setTimeout(() => {
        supabase.auth.refreshSession().then(({ data, error }) => {
          if (error) {
            devLogger.auth.warn('⚠️ Background refresh failed:', error.message);
          } else if (data.session) {
            devLogger.auth.info('✅ Background refresh successful');
            onAuthStateChange(data.session);
          }
        });
      }, Math.max(0, timeUntilExpiry - refreshBuffer));

      return () => clearTimeout(timeout);
    }
  }, [session, isInitialized, onAuthStateChange]);

  return { recoverSession };
}