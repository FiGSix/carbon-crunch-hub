
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { getUserRole, getCurrentUser } from '@/lib/supabase/auth';
import { getProfile } from '@/lib/supabase/profile';
import { UserRole, UserProfile } from '../types';
import { useToast } from '@/hooks/use-toast';

export function useAuthInitialization() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authInitialized, setAuthInitialized] = useState(false);
  const { toast } = useToast();

  // Debounced state update to prevent rapid re-renders
  const [stateUpdateTimeout, setStateUpdateTimeout] = useState<NodeJS.Timeout | null>(null);

  // Memoized state to prevent unnecessary re-renders
  const authState = useMemo(() => ({
    session,
    user,
    userRole,
    profile,
    isLoading,
    authInitialized
  }), [session, user, userRole, profile, isLoading, authInitialized]);

  // Function to fetch user profile data with better error handling and caching
  const fetchUserData = useCallback(async (currentUser: User, skipLoading = false) => {
    if (!skipLoading) {
      setIsLoading(true);
    }
    
    try {
      // Use Promise.allSettled to handle partial failures gracefully
      const [roleResult, profileResult] = await Promise.allSettled([
        getUserRole(),
        getProfile()
      ]);
      
      // Handle role result
      if (roleResult.status === 'fulfilled' && roleResult.value.role) {
        setUserRole(roleResult.value.role);
        console.log("Role from API:", roleResult.value.role);
      } else {
        console.log("No role found from API or role fetch failed");
        setUserRole(null);
      }
      
      // Handle profile result
      if (profileResult.status === 'fulfilled' && !profileResult.value.error && profileResult.value.profile) {
        setProfile(profileResult.value.profile);
      } else {
        if (profileResult.status === 'rejected') {
          console.error("Error fetching user profile:", profileResult.reason);
        } else if (profileResult.status === 'fulfilled') {
          console.error("Error fetching user profile:", profileResult.value.error);
        }
        setProfile(null);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      setUserRole(null);
      setProfile(null);
    } finally {
      if (!skipLoading) {
        setIsLoading(false);
      }
    }
  }, []);

  // Helper function to clear auth state
  const clearAuthState = useCallback(() => {
    console.log("Clearing auth state");
    setUser(null);
    setUserRole(null);
    setProfile(null);
    setSession(null);
  }, []);

  // Debounced state update function to prevent rapid re-renders
  const debouncedStateUpdate = useCallback((newSession: Session | null, event: string) => {
    if (stateUpdateTimeout) {
      clearTimeout(stateUpdateTimeout);
    }

    const timeout = setTimeout(() => {
      setSession(newSession);
      setUser(newSession?.user || null);
      
      if (newSession?.user && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')) {
        // Defer user data fetching to prevent blocking auth state updates
        setTimeout(() => {
          fetchUserData(newSession.user, true)
            .finally(() => setIsLoading(false));
        }, 100);
      } else {
        setIsLoading(false);
      }
    }, 50); // Small debounce to batch rapid auth state changes

    setStateUpdateTimeout(timeout);
  }, [stateUpdateTimeout, fetchUserData]);

  useEffect(() => {
    console.log("Initializing auth context");
    let subscription: { unsubscribe: () => void } | null = null;
    
    async function initAuth() {
      setIsLoading(true);
      
      try {
        // Set up auth state listener FIRST to avoid missing events
        subscription = supabase.auth.onAuthStateChange(
          (event, newSession) => {
            console.log('Auth state changed:', event, 'User ID:', newSession?.user?.id);
            
            if (event === 'SIGNED_OUT') {
              // For SIGNED_OUT events, clear auth state immediately
              console.log("SIGNED_OUT event received, clearing auth state");
              clearAuthState();
              setIsLoading(false);
            } else {
              // Use debounced update for other events
              debouncedStateUpdate(newSession, event);
            }
          }
        ).data.subscription;
        
        // THEN check if there's an existing session
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        
        // Handle initial session if it exists
        if (currentSession?.user) {
          console.log("Initial session found, user ID:", currentSession.user.id);
          setSession(currentSession);
          setUser(currentSession.user);
          
          await fetchUserData(currentSession.user, true);
        }

        // Mark auth as initialized to prevent duplicate initialization
        setAuthInitialized(true);
        setIsLoading(false);
      } catch (error) {
        console.error('Error initializing auth:', error);
        toast({
          title: 'Error',
          description: 'Failed to initialize authentication',
          variant: 'destructive',
        });
        setIsLoading(false);
      }
    }
    
    if (!authInitialized) {
      initAuth();
    }
    
    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
      if (stateUpdateTimeout) {
        clearTimeout(stateUpdateTimeout);
      }
    };
  }, [toast, authInitialized, debouncedStateUpdate, fetchUserData, clearAuthState, stateUpdateTimeout]);

  return {
    ...authState,
    setUser,
    setSession,
    setUserRole,
    setProfile,
    setIsLoading
  };
}
