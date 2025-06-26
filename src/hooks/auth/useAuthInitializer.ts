
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
    let timeoutId: NodeJS.Timeout;
    let initializationTimeoutId: NodeJS.Timeout;

    const initializeAuth = async () => {
      try {
        if (import.meta.env.DEV) {
          console.log('🚀 Initializing auth with enhanced error handling...');
        }
        const startTime = performance.now();
        
        // Set a maximum initialization time of 15 seconds
        initializationTimeoutId = setTimeout(() => {
          if (!isUnmountedRef.current) {
            if (import.meta.env.DEV) {
              console.warn('⏰ Auth initialization timed out, proceeding without session');
            }
            setIsLoading(false);
            setIsInitialized(true);
          }
        }, 15000);
        
        // Get initial session with improved timeout handling
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise<never>((_, reject) => {
          timeoutId = setTimeout(() => reject(new Error('Session fetch timeout after 10 seconds')), 10000);
        });
        
        try {
          const { data: { session }, error } = await Promise.race([
            sessionPromise,
            timeoutPromise
          ]);
          
          // Clear timeout if successful
          if (timeoutId) clearTimeout(timeoutId);
          if (initializationTimeoutId) clearTimeout(initializationTimeoutId);
          
          if (error) {
            if (import.meta.env.DEV) {
              console.warn('⚠️ Session fetch error (continuing without session):', error.message);
            }
            // Don't throw here - let the app continue without session
          }
          
          if (isUnmountedRef.current) return;

          // Update state in batches to prevent multiple re-renders
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
          
          const endTime = performance.now();
          if (import.meta.env.DEV) {
            console.log(`⚡ Auth initialization completed in ${(endTime - startTime).toFixed(2)}ms`);
          }
        } catch (timeoutError) {
          if (import.meta.env.DEV) {
            console.warn('⚠️ Session fetch timed out, continuing without session');
          }
          if (timeoutId) clearTimeout(timeoutId);
          if (initializationTimeoutId) clearTimeout(initializationTimeoutId);
          // Continue with null session instead of failing
        }
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error('💥 Auth initialization error:', error);
        }
        // Don't throw here - let the app continue with null session
      } finally {
        if (!isUnmountedRef.current) {
          setIsLoading(false);
          setIsInitialized(true);
        }
      }
    };

    // Set up auth state listener with improved error handling
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (isUnmountedRef.current) return;

      if (import.meta.env.DEV) {
        console.log('🔔 Auth state changed:', event, session ? 'session exists' : 'no session');
      }
      
      // Batch state updates to prevent multiple re-renders
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
      if (timeoutId) clearTimeout(timeoutId);
      if (initializationTimeoutId) clearTimeout(initializationTimeoutId);
    };
  }, [isUnmountedRef, setIsLoading, setIsInitialized, updateAuthState, updateProfileState, loadUserProfileWithFallback]);
}
