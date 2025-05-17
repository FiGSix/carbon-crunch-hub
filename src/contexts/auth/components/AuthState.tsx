
import { ReactNode } from 'react';
import { useAuthInitialization } from '../hooks/useAuthInitialization';
import { useAuthRefresh } from '../hooks/useAuthRefresh';
import { useAuthDebug } from '../hooks/useAuthDebug';
import { AuthContextProvider } from './AuthContextProvider';

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
    isAdmin
  };

  return (
    <AuthContextProvider value={authState}>
      {children}
    </AuthContextProvider>
  );
}
