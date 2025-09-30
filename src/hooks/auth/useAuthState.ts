
import { useState, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { UserProfile, UserRole } from '@/contexts/auth/types';

export function useAuthState() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [userRole, setUserRole] = useState<UserRole | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);

  // Prevent memory leaks and race conditions
  const isUnmountedRef = useRef(false);

  const updateAuthState = (newSession: Session | null) => {
    setSession(newSession);
    setUser(newSession?.user ?? null);
  };

  const updateProfileState = (newProfile: UserProfile | null) => {
    setProfile(newProfile);
    setUserRole(newProfile?.role);
  };

  const clearAuthState = () => {
    setUser(null);
    setSession(null);
    setProfile(null);
    setUserRole(undefined);
  };

  return {
    // State
    user,
    session,
    profile,
    userRole,
    isLoading,
    isInitialized,
    isUnmountedRef,
    
    // Setters
    setIsLoading,
    setIsInitialized,
    updateAuthState,
    updateProfileState,
    clearAuthState
  };
}
