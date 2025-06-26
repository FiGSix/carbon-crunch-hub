
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
        
        // Get initial session
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          if (import.meta.env.DEV) {
            console.warn('⚠️ Session fetch error:', error.message);
          }
        }
        
        if (isUnmountedRef.current) return;

        // Update auth state
        updateAuthState(session);
        
        if (session?.user) {
          if (import.meta.env.DEV) {
            console.log('✅ Initial session found, loading user profile');
          }
          // Load profile but don't block initialization
          loadUserProfileWithFallback(session.user.id).catch(error => {
            if (import.meta.env.DEV) {
              console.warn('⚠️ Profile loading failed during initialization:', error);
            }
          });
        } else {
          if (import.meta.env.DEV) {
            console.log('ℹ️ No initial session found');
          }
        }
        
        if (import.meta.env.DEV) {
          console.log(`⚡ Auth initialization completed`);
        }
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error('💥 Auth initialization error:', error);
        }
      } finally {
        if (!isUnmountedRef.current) {
          setIsLoading(false);
          setIsInitialized(true);
        }
      }
    };

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (isUnmountedRef.current) return;

      if (import.meta.env.DEV) {
        console.log('🔔 Auth state changed:', event, session ? 'session exists' : 'no session');
      }
      
      // Update auth state
      updateAuthState(session);

      if (session?.user) {
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
          console.log('🚪 User signed out, clearing profile');
        }
        updateProfileState(null);
        authCache.clear();
      }

      if (event === 'SIGNED_OUT') {
        if (import.meta.env.DEV) {
          console.log('🧹 Clearing all auth state');
        }
        updateProfileState(null);
        authCache.clear();
      }
    });

    initializeAuth();

    return () => {
      isUnmountedRef.current = true;
      subscription.unsubscribe();
    };
  }, [isUnmountedRef, setIsLoading, setIsInitialized, updateAuthState, updateProfileState, loadUserProfileWithFallback]);
}
