
import { useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { UserProfile, UserRole } from '@/contexts/auth/types';
import { UnifiedDataService } from '@/services/unified/UnifiedDataService';

/**
 * Simplified auth hook that replaces the complex auth architecture
 * Provides clean, reliable auth state management
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
        console.log('Initializing simplified auth...');
        
        // Get initial session
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        
        if (mounted) {
          setSession(initialSession);
          setUser(initialSession?.user ?? null);
          
          if (initialSession?.user) {
            console.log('Initial session found, loading user profile');
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

      console.log('Auth state changed:', event, 'User ID:', session?.user?.id);
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        await loadUserProfile(session.user.id);
      } else {
        setProfile(null);
        setUserRole(undefined);
      }

      if (event === 'SIGNED_OUT') {
        console.log('User signed out, clearing cache');
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
      console.log('Loading user profile for:', userId);
      const userProfile = await UnifiedDataService.getProfile(userId);
      setProfile(userProfile);
      setUserRole(userProfile?.role as UserRole);
      console.log('User profile loaded, role:', userProfile?.role);
    } catch (error) {
      console.error('Error loading profile:', error);
      setProfile(null);
      setUserRole(undefined);
    }
  };

  const refreshUser = async () => {
    if (user?.id) {
      console.log('Refreshing user profile');
      await loadUserProfile(user.id);
    }
  };

  const signOut = async () => {
    try {
      console.log('Signing out user');
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      // Clear all state
      setUser(null);
      setSession(null);
      setProfile(null);
      setUserRole(undefined);
      UnifiedDataService.clearCache();
      
      console.log('Sign out completed successfully');
    } catch (error) {
      console.error('Error signing out:', error);
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
