
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthState } from './auth/useAuthState';
import { useProfileLoader } from './auth/useProfileLoader';
import { useAuthInitializer } from './auth/useAuthInitializer';
import { useAuthStateSync } from './auth/useAuthStateSync';
import { useAuthReliability } from './auth/useAuthReliability';
import { authCache } from './auth/authCache';
import { useToast } from './use-toast';

/**
 * Simplified auth hook with improved session persistence and error handling
 * Now includes authentication state synchronization and reliability features
 */
export function useAuthSimplified() {
  const { toast } = useToast();
  const [authError, setAuthError] = useState<string | null>(null);
  
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

  // Add auth state synchronization to prevent auth.uid() returning null
  useAuthStateSync({
    session,
    onAuthStateChange: updateAuthState
  });

  // Add reliability features for connection monitoring and recovery
  const { recoverSession } = useAuthReliability({
    session,
    isInitialized,
    onAuthStateChange: updateAuthState,
    onError: (error) => {
      setAuthError(error);
      toast({
        title: "Authentication Issue",
        description: error,
        variant: "destructive"
      });
    }
  });

  const signOut = async () => {
    try {
      if (import.meta.env.DEV) {
        console.log('🚪 Starting sign out process');
      }
      
      // Clear auth error state
      setAuthError(null);
      
      // Perform the actual sign out first
      const { error } = await supabase.auth.signOut({
        scope: 'global' // Sign out from all devices
      });
      
      if (error) {
        if (import.meta.env.DEV) {
          console.error('❌ Sign out error:', error);
        }
        throw error;
      }
      
      // Clear state and cache after successful sign out
      clearAuthState();
      authCache.clear();
      
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

  const refreshAuth = async () => {
    try {
      setAuthError(null);
      const recovered = await recoverSession();
      if (!recovered) {
        setAuthError('Unable to refresh authentication');
        toast({
          title: "Authentication Error", 
          description: "Please sign in again",
          variant: "destructive"
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown auth error';
      setAuthError(errorMessage);
      toast({
        title: "Authentication Error",
        description: errorMessage,
        variant: "destructive"
      });
    }
  };

  return {
    user,
    session,
    profile,
    userRole,
    isLoading,
    isInitialized,
    authError,
    refreshUser,
    refreshAuth,
    signOut
  };
}
