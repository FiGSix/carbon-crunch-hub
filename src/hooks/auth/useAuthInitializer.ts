
import React, { useEffect } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { authCache } from '@/lib/cache/UnifiedCache';

interface UseAuthInitializerProps {
  isUnmountedRef: React.MutableRefObject<boolean>;
  setIsLoading: (loading: boolean) => void;
  setIsInitialized: (initialized: boolean) => void;
  updateAuthState: (session: Session | null) => void;
  updateProfileState: (profile: any) => void;
  loadUserProfileWithFallback: (userId: string) => Promise<void>;
}

export function useAuthInitializer({
  isUnmountedRef,
  setIsLoading,
  setIsInitialized,
  updateAuthState,
  updateProfileState,
  loadUserProfileWithFallback
}: UseAuthInitializerProps) {

  useEffect(() => {
    isUnmountedRef.current = false;

    const initializeAuth = async () => {
      try {
        // Note: Console logging removed for performance optimization
        
        // Get initial session with better error handling
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          // Don't throw here, just continue with null session
        }
        
        if (isUnmountedRef.current) return;

        // Validate session before using it
        const isValidSession = session && session.expires_at && new Date(session.expires_at * 1000) > new Date();
        
        // Update auth state with validated session
        updateAuthState(isValidSession ? session : null);
        
        if (isValidSession && session.user) {
          // Load profile but don't block initialization
          loadUserProfileWithFallback(session.user.id).catch(() => {
            // Profile loading error handled by loadUserProfileWithFallback
          });
        } else {
          // Clear any stale profile data
          updateProfileState(null);
        }
      } catch (error) {
        // Note: Console logging removed for performance optimization
        // Don't throw, just clear state and continue
        updateAuthState(null);
        updateProfileState(null);
      } finally {
        if (!isUnmountedRef.current) {
          setIsLoading(false);
          setIsInitialized(true);
        }
      }
    };

    // Set up auth state listener with improved session validation
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (isUnmountedRef.current) return;

      // Note: Console logging removed for performance optimization
      
      // Validate session before using it
      const isValidSession = session && session.expires_at && new Date(session.expires_at * 1000) > new Date();
      
      // Update auth state with validated session
      updateAuthState(isValidSession ? session : null);

      if (isValidSession && session.user) {
        // Load profile but don't block the auth state change
        loadUserProfileWithFallback(session.user.id).catch(() => {
          // Profile loading error handled by loadUserProfileWithFallback
        });
      } else {
        updateProfileState(null);
        authCache.clear();
      }

      if (event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
        if (!isValidSession) {
          updateProfileState(null);
          authCache.clear();
        }
      }
    });

    initializeAuth();

    return () => {
      isUnmountedRef.current = true;
      subscription.unsubscribe();
    };
  }, [isUnmountedRef, setIsLoading, setIsInitialized, updateAuthState, updateProfileState, loadUserProfileWithFallback]);
}
