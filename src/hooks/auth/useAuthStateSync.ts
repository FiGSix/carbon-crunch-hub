import { useEffect, useCallback, useRef } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface UseAuthStateSyncProps {
  session: Session | null;
  onAuthStateChange: (session: Session | null) => void;
}

/**
 * Ensures database and frontend auth state are synchronized
 * Optimized to prevent excessive validation loops
 */
export function useAuthStateSync({ session, onAuthStateChange }: UseAuthStateSyncProps) {
  const lastValidationRef = useRef<number>(0);
  const isValidatingRef = useRef<boolean>(false);
  
  const validateAndSyncSession = useCallback(async (currentSession: Session | null, force = false) => {
    // Prevent concurrent validations
    if (isValidatingRef.current && !force) {
      return;
    }

    // Rate limiting: Don't validate more than once per minute unless forced
    const now = Date.now();
    const timeSinceLastValidation = now - lastValidationRef.current;
    if (!force && timeSinceLastValidation < 60 * 1000) { // 1 minute
      return;
    }

    if (!currentSession) {
      return;
    }

    // Only validate if session is close to expiry (within 10 minutes) or forced
    const expiresAt = currentSession.expires_at;
    if (expiresAt && !force) {
      const timeUntilExpiry = (expiresAt * 1000) - Date.now();
      if (timeUntilExpiry > 10 * 60 * 1000) { // More than 10 minutes
        return; // Skip unnecessary validation
      }
    }

    isValidatingRef.current = true;
    lastValidationRef.current = now;

    try {
      // Lightweight validation - just refresh the session if needed
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
      
      if (refreshError) {
        // Only sign out if it's a critical auth error
        if (refreshError.message.includes('Invalid Refresh Token') || 
            refreshError.message.includes('refresh_token_not_found')) {
          await supabase.auth.signOut();
          onAuthStateChange(null);
        }
      } else if (refreshData.session) {
        onAuthStateChange(refreshData.session);
      }
    } catch (error) {
      // Don't force logout on network errors or temporary issues
      console.warn('Session validation failed:', error);
    } finally {
      isValidatingRef.current = false;
    }
  }, [onAuthStateChange]);

  // Only validate on visibility change
  useEffect(() => {
    if (!session) return;

    const handleVisibilityChange = () => {
      if (!document.hidden && session) {
        validateAndSyncSession(session, false);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [session, validateAndSyncSession]);

  // Initial validation only when session ID changes (not on every session update)
  const sessionIdRef = useRef<string | null>(null);
  useEffect(() => {
    const currentSessionId = session?.access_token?.substring(0, 20) || null;
    if (currentSessionId !== sessionIdRef.current) {
      sessionIdRef.current = currentSessionId;
      if (session) {
        validateAndSyncSession(session, true); // Force initial validation
      }
    }
  }, [session, validateAndSyncSession]);

  return { validateAndSyncSession };
}