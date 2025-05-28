
import React, { ReactNode, useMemo } from 'react';
import { useAuthInitialization } from '../hooks/useAuthInitialization';
import { useAuthRefresh } from '../hooks/useAuthRefresh';
import { useAuthDebug } from '../hooks/useAuthDebug';
import { AuthContextProvider } from './AuthContextProvider';
import { signOut as supabaseSignOut } from '@/lib/supabase';

interface AuthStateProps {
  children: ReactNode;
}

export function AuthState({ children }: AuthStateProps) {
  // Use our optimized auth initialization hook
  const {
    session,
    user,
    userRole,
    profile,
    isLoading,
    authInitialized,
    setUser,
    setSession,
    setUserRole,
    setProfile,
    setIsLoading
  } = useAuthInitialization();

  const { refreshUser, isRefreshing, refreshAttemptCount } = useAuthRefresh({
    setUser,
    setUserRole,
    setProfile,
    setSession,
    setIsLoading
  });

  const { debugAuthState } = useAuthDebug({
    user,
    userRole,
    profile
  });

  // Memoize derived state to prevent unnecessary re-renders
  const isAdmin = useMemo(() => userRole === 'admin', [userRole]);
  
  // Memoized sign out function to prevent recreation on every render
  const handleSignOut = useMemo(() => async (): Promise<boolean> => {
    console.log("Auth context: Starting sign out process");
    
    try {
      // Clear local state first to prevent UI flashes during signout
      setIsLoading(true);
      setUser(null);
      setUserRole(null);
      setProfile(null);
      setSession(null);
      
      // Now call Supabase signOut
      const { success, error } = await supabaseSignOut();
      
      if (error) {
        console.error("Auth context: Error during sign out:", error);
        return false;
      }
      
      console.log("Auth context: Sign out completed, success:", success);
      return success;
    } catch (error) {
      console.error("Auth context: Error during sign out:", error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [setIsLoading, setUser, setUserRole, setProfile, setSession]);

  // Memoized refresh user function to match expected interface
  const memoizedRefreshUser = useMemo(() => async () => {
    await refreshUser();
    // Convert boolean return to void to satisfy the interface
    return;
  }, [refreshUser]);

  // Memoize the auth state to prevent unnecessary re-renders in child components
  const authState = useMemo(() => ({
    session, 
    user, 
    userRole, 
    profile, 
    isLoading, 
    isRefreshing,
    refreshAttemptCount,
    authInitialized,
    refreshUser: memoizedRefreshUser,
    debugAuthState,
    isAdmin,
    signOut: handleSignOut
  }), [
    session,
    user,
    userRole,
    profile,
    isLoading,
    isRefreshing,
    refreshAttemptCount,
    authInitialized,
    memoizedRefreshUser,
    debugAuthState,
    isAdmin,
    handleSignOut
  ]);

  return (
    <AuthContextProvider value={authState}>
      {children}
    </AuthContextProvider>
  );
}
