
import { createContext, ReactNode } from 'react';
import { AuthContextType } from './types';
import { useAuthInitialization } from './hooks/useAuthInitialization';
import { useAuthRefresh } from './hooks/useAuthRefresh';
import { useAuthDebug } from './hooks/useAuthDebug';

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  // Use our custom hooks for different aspects of auth functionality
  const {
    session,
    user,
    userRole,
    profile,
    isLoading,
    setUser,
    setSession,
    setUserRole,
    setProfile,
    setIsLoading
  } = useAuthInitialization();

  const { refreshUser } = useAuthRefresh({
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

  return (
    <AuthContext.Provider value={{ 
      session, 
      user, 
      userRole, 
      profile, 
      isLoading, 
      refreshUser,
      debugAuthState
    }}>
      {children}
    </AuthContext.Provider>
  );
}
