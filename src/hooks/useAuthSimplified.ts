
import { supabase } from '@/integrations/supabase/client';
import { useAuthState } from './auth/useAuthState';
import { useProfileLoader } from './auth/useProfileLoader';
import { useAuthInitializer } from './auth/useAuthInitializer';
import { authCache } from './auth/authCache';

/**
 * Simplified auth hook with improved error handling and fallback mechanisms
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
        console.log('🚪 Signing out user');
      }
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      // Clear all state immediately
      clearAuthState();
      authCache.clear();
      
      if (import.meta.env.DEV) {
        console.log('✅ Sign out completed successfully');
      }
    } catch (error) {
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
