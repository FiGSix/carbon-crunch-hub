
import { useEffect } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { authCache } from './authCache';

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
        if (import.meta.env.DEV) {
          console.log('🚀 Initializing auth...');
        }
        
        // Get initial session with better error handling
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          if (import.meta.env.DEV) {
            console.warn('⚠️ Session fetch error:', error.message);
          }
          // Don't throw here, just log and continue
        }
        
        if (isUnmountedRef.current) return;

        // Validate session before using it
        const isValidSession = session && session.expires_at && new Date(session.expires_at * 1000) > new Date();
        
        if (import.meta.env.DEV) {
          console.log('📋 Session validation:', {
            hasSession: !!session,
            isValid: isValidSession,
            expiresAt: session?.expires_at ? new Date(session.expires_at * 1000).toISOString() : 'none'
          });
        }

        // Update auth state with validated session
        updateAuthState(isValidSession ? session : null);
        
        if (isValidSession && session.user) {
          if (import.meta.env.DEV) {
            console.log('✅ Valid session found, loading user profile');
          }
          // Load profile but don't block initialization
          loadUserProfileWithFallback(session.user.id).catch(error => {
            if (import.meta.env.DEV) {
              console.warn('⚠️ Profile loading failed during initialization:', error);
            }
          });
        } else {
          if (import.meta.env.DEV) {
            console.log('ℹ️ No valid session found');
          }
          // Clear any stale profile data
          updateProfileState(null);
        }
        
        if (import.meta.env.DEV) {
          console.log(`⚡ Auth initialization completed`);
        }
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error('💥 Auth initialization error:', error);
        }
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

      if (import.meta.env.DEV) {
        console.log('🔔 Auth state changed:', event, {
          hasSession: !!session,
          sessionValid: session ? (new Date(session.expires_at * 1000) > new Date()) : false,
          expiresAt: session?.expires_at ? new Date(session.expires_at * 1000).toISOString() : 'none'
        });
      }
      
      // Validate session before using it
      const isValidSession = session && session.expires_at && new Date(session.expires_at * 1000) > new Date();
      
      // Update auth state with validated session
      updateAuthState(isValidSession ? session : null);

      if (isValidSession && session.user) {
        if (import.meta.env.DEV) {
          console.log('👤 Loading profile for authenticated user');
        }
        // Load profile but don't block the auth state change
        loadUserProfileWithFallback(session.user.id).catch(error => {
          if (import.meta.env.DEV) {
            console.warn('⚠️ Profile loading failed during auth state change:', error);
          }
        });
      } else {
        if (import.meta.env.DEV) {
          console.log('🚪 User signed out or session invalid/expired, clearing profile');
        }
        updateProfileState(null);
        authCache.clear();
      }

      if (event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
        if (import.meta.env.DEV) {
          console.log('🧹 Clearing cache due to auth event:', event);
        }
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
