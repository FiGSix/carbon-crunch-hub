
import { supabase } from '@/integrations/supabase/client';
import { useAuthState } from './auth/useAuthState';
import { useProfileLoader } from './auth/useProfileLoader';
import { useAuthInitializer } from './auth/useAuthInitializer';
import { authCache } from './auth/authCache';

/**
 * Simplified auth hook with improved session persistence and error handling
 */
export function useAuthSimplified() {
  const {
    user,
    session,
    profile,
    userRole,
    isLoading,
    isInitialized,
    isUnmountedRef,
    setIsLoading,
    setIsInitialized,
    updateAuthState,
    updateProfileState,
    clearAuthState
  } = useAuthState();

  const { loadUserProfileWithFallback, refreshUser } = useProfileLoader({
    user,
    isUnmountedRef,
    updateProfileState
  });

  useAuthInitializer({
    isUnmountedRef,
    setIsLoading,
    setIsInitialized,
    updateAuthState,
    updateProfileState,
    loadUserProfileWithFallback
  });

  const signOut = async () => {
    try {
      if (import.meta.env.DEV) {
        console.log('🚪 Starting sign out process');
      }
      
      // Clear state first to prevent UI flickering
      clearAuthState();
      authCache.clear();
      
      // Then perform the actual sign out
      const { error } = await supabase.auth.signOut({
        scope: 'global' // Sign out from all devices
      });
      
      if (error) {
        if (import.meta.env.DEV) {
          console.error('❌ Sign out error:', error);
        }
        throw error;
      }
      
      if (import.meta.env.DEV) {
        console.log('✅ Sign out completed successfully');
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('💥 Exception during sign out:', error);
      }
      throw error;
    }
  };

  return {
    user,
    session,
    profile,
    userRole,
    isLoading,
    isInitialized,
    refreshUser,
    signOut
  };
}
