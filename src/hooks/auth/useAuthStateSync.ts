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
      console.log('🔄 Validating and syncing session state');
    }

    if (!currentSession) {
      if (import.meta.env.DEV) {
        console.log('❌ No session to validate');
      }
      return;
    }

    try {
      // Test if database can see the current session
      const { data: testResult, error: testError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', currentSession.user.id)
        .limit(1);

      if (testError) {
        if (import.meta.env.DEV) {
          console.warn('⚠️ Database cannot access session, attempting refresh:', testError.message);
        }
        
        // Try to refresh the session
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
        
        if (refreshError) {
          if (import.meta.env.DEV) {
            console.error('❌ Session refresh failed:', refreshError.message);
          }
          // Force sign out if refresh fails
          await supabase.auth.signOut();
          onAuthStateChange(null);
        } else if (refreshData.session) {
          if (import.meta.env.DEV) {
            console.log('✅ Session refreshed successfully');
          }
          onAuthStateChange(refreshData.session);
        }
      } else {
        if (import.meta.env.DEV) {
          console.log('✅ Database session sync verified');
        }
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('💥 Session validation error:', error);
      }
    }
  }, [onAuthStateChange]);

  // Validate session every 5 minutes to ensure sync
  useEffect(() => {
    if (!session) return;

    const interval = setInterval(() => {
      validateAndSyncSession(session);
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [session, validateAndSyncSession]);

  // Initial validation on session change
  useEffect(() => {
    validateAndSyncSession(session);
  }, [session, validateAndSyncSession]);

  return { validateAndSyncSession };
}