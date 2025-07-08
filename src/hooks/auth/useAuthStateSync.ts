import { useEffect, useCallback } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface UseAuthStateSyncProps {
  session: Session | null;
  onAuthStateChange: (session: Session | null) => void;
}

/**
 * Ensures database and frontend auth state are synchronized
 * Addresses the auth.uid() returning null issue
 */
export function useAuthStateSync({ session, onAuthStateChange }: UseAuthStateSyncProps) {
  
  const validateAndSyncSession = useCallback(async (currentSession: Session | null) => {
    if (import.meta.env.DEV) {
      console.log('🔄 Passive session validation triggered');
    }

    if (!currentSession) {
      if (import.meta.env.DEV) {
        console.log('❌ No session to validate');
      }
      return;
    }

    try {
      // Only validate if session is close to expiry (within 10 minutes)
      const expiresAt = currentSession.expires_at;
      if (expiresAt) {
        const timeUntilExpiry = (expiresAt * 1000) - Date.now();
        if (timeUntilExpiry > 10 * 60 * 1000) { // More than 10 minutes
          if (import.meta.env.DEV) {
            console.log('✅ Session still valid, skipping validation');
          }
          return; // Skip unnecessary validation
        }
      }

      // Lightweight validation - just refresh the session if needed
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
      
      if (refreshError) {
        if (import.meta.env.DEV) {
          console.warn('⚠️ Session refresh failed:', refreshError.message);
        }
        
        // Only sign out if it's a critical auth error
        if (refreshError.message.includes('Invalid Refresh Token') || 
            refreshError.message.includes('refresh_token_not_found')) {
          if (import.meta.env.DEV) {
            console.error('❌ Critical auth error, signing out');
          }
          await supabase.auth.signOut();
          onAuthStateChange(null);
        }
      } else if (refreshData.session) {
        if (import.meta.env.DEV) {
          console.log('✅ Session refreshed successfully');
        }
        onAuthStateChange(refreshData.session);
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('💥 Session validation error (non-critical):', error);
      }
      // Don't force logout on network errors or temporary issues
    }
  }, [onAuthStateChange]);

  // Passive session validation - only on network errors or specific triggers
  useEffect(() => {
    if (!session) return;

    // Only validate on focus/visibility change instead of aggressive intervals
    const handleVisibilityChange = () => {
      if (!document.hidden && session) {
        validateAndSyncSession(session);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [session, validateAndSyncSession]);

  // Initial validation on session change
  useEffect(() => {
    validateAndSyncSession(session);
  }, [session, validateAndSyncSession]);

  return { validateAndSyncSession };
}