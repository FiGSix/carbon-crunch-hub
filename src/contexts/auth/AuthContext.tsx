
import React, { createContext, useContext, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { UserProfile, UserRole } from './types';
import { useAuthSimplified } from '@/hooks/useAuthSimplified';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  userRole: UserRole | undefined;
  isLoading: boolean;
  isAdmin: boolean;
  isAuthenticated: boolean;
  isInitialized: boolean;
  authError: string | null;
  refreshUser: () => Promise<void>;
  refreshAuth: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const auth = useAuthSimplified();
  
  // Enhanced authentication check with session validation and redirect protection
  const isAuthenticated = !!(
    auth.user && 
    auth.session && 
    auth.session.expires_at && 
    new Date(auth.session.expires_at * 1000) > new Date()
  );
  
  const contextValue: AuthContextType = {
    ...auth,
    isAdmin: auth.userRole === 'admin',
    isAuthenticated
  };

  // Enhanced logging with session validation details (development only)
  if (import.meta.env.DEV) {
    console.log('🔄 AuthContext state update:', {
      hasUser: !!auth.user,
      hasSession: !!auth.session,
      hasProfile: !!auth.profile,
      userRole: auth.userRole,
      isAuthenticated,
      isInitialized: auth.isInitialized,
      isLoading: auth.isLoading,
      authError: auth.authError,
      sessionValid: auth.session ? (new Date(auth.session.expires_at * 1000) > new Date()) : false,
      sessionExpiresAt: auth.session?.expires_at ? new Date(auth.session.expires_at * 1000).toISOString() : 'none',
      profileId: auth.profile?.id || 'none'
    });
  }

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
