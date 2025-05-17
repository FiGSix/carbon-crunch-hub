
import { ReactNode } from 'react';
import { useAuthInitialization } from '../hooks/useAuthInitialization';
import { useAuthRefresh } from '../hooks/useAuthRefresh';
import { useAuthDebug } from '../hooks/useAuthDebug';
import { AuthContextProvider } from './AuthContextProvider';
import { signOut as supabaseSignOut } from '@/lib/supabase';

interface AuthStateProps {
  children: ReactNode;
}

export function AuthState({ children }: AuthStateProps) {
  // Use our custom hooks for different aspects of auth functionality
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

  // Determine if user is admin
  const isAdmin = userRole === 'admin';
  
  // Implement a proper sign out function that clears state first, then calls supabase
  const handleSignOut = async (): Promise<boolean> => {
    console.log("Auth context: Signing out user");
    
    try {
      // Clear local state immediately (before the async operation)
      setUser(null);
      setUserRole(null);
      setProfile(null);
      setSession(null);
      
      // Now call Supabase signOut
      const { success } = await supabaseSignOut();
      
      console.log("Auth context: Sign out completed, success:", success);
      return success;
    } catch (error) {
      console.error("Auth context: Error during sign out:", error);
      return false;
    }
  };

  // Compile the auth state to be provided by the context
  const authState = {
    session, 
    user, 
    userRole, 
    profile, 
    isLoading, 
    isRefreshing,
    refreshAttemptCount,
    authInitialized,
    refreshUser: async () => {
      const result = await refreshUser();
      // Convert boolean return to void to satisfy the interface
      return;
    },
    debugAuthState,
    isAdmin,
    // Add the centralized sign out function
    signOut: handleSignOut
  };

  return (
    <AuthContextProvider value={authState}>
      {children}
    </AuthContextProvider>
  );
}
