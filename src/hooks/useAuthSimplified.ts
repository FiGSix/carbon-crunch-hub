
import { useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { UserProfile, UserRole } from '@/contexts/auth/types';
import { UnifiedDataService } from '@/services/unified/UnifiedDataService';

/**
 * Simplified auth hook that provides clean, reliable auth state management
 * This can eventually replace the complex auth architecture
 */
export function useAuthSimplified() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [userRole, setUserRole] = useState<UserRole | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize auth state
  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        // Get initial session
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        
        if (mounted) {
          setSession(initialSession);
          setUser(initialSession?.user ?? null);
          
          if (initialSession?.user) {
            await loadUserProfile(initialSession.user.id);
          }
          
          setIsLoading(false);
          setIsInitialized(true);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        if (mounted) {
          setIsLoading(false);
          setIsInitialized(true);
        }
      }
    };

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      console.log('Auth state changed:', event);
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        await loadUserProfile(session.user.id);
      } else {
        setProfile(null);
        setUserRole(undefined);
      }

      if (event === 'SIGNED_OUT') {
        UnifiedDataService.clearCache();
      }
    });

    initializeAuth();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const loadUserProfile = async (userId: string) => {
    try {
      const userProfile = await UnifiedDataService.getProfile(userId);
      setProfile(userProfile);
      setUserRole(userProfile?.role as UserRole);
    } catch (error) {
      console.error('Error loading profile:', error);
      setProfile(null);
      setUserRole(undefined);
    }
  };

  const refreshUser = async () => {
    if (user?.id) {
      await loadUserProfile(user.id);
    }
  };

  const signOut = async (): Promise<boolean> => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      // Clear all state
      setUser(null);
      setSession(null);
      setProfile(null);
      setUserRole(undefined);
      UnifiedDataService.clearCache();
      
      return true;
    } catch (error) {
      console.error('Error signing out:', error);
      return false;
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
    signOut,
    // Computed properties
    isAdmin: userRole === 'admin',
    isAuthenticated: !!user
  };
}
