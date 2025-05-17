
import { useState, useEffect } from 'react';
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

  // Function to fetch user profile data with debouncing
  const fetchUserData = async (currentUser: User, skipLoading = false) => {
    if (!skipLoading) {
      setIsLoading(true);
    }
    
    try {
      // Run both requests in parallel with Promise.all for better performance
      const [roleResult, profileResult] = await Promise.all([
        getUserRole(),
        getProfile()
      ]);
      
      if (roleResult.role) {
        setUserRole(roleResult.role);
        console.log("Role from API:", roleResult.role);
      } else {
        console.log("No role found from API");
        setUserRole(null);
      }
      
      if (!profileResult.error && profileResult.profile) {
        setProfile(profileResult.profile);
      } else if (profileResult.error) {
        console.error("Error fetching user profile:", profileResult.error);
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
  };

  // Helper function to clear auth state
  const clearAuthState = () => {
    console.log("Clearing auth state");
    setUser(null);
    setUserRole(null);
    setProfile(null);
    setSession(null);
  };

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
              // Update basic session and user data for other events
              setSession(newSession);
              setUser(newSession?.user || null);
              
              if (newSession?.user) {
                // For SIGNED_IN events, fetch role and profile
                if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
                  // Use setTimeout to avoid recursive auth state changes
                  setTimeout(() => {
                    fetchUserData(newSession.user, true)
                      .finally(() => setIsLoading(false));
                  }, 0);
                } else {
                  setIsLoading(false);
                }
              } else {
                setIsLoading(false);
              }
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
    };
  }, [toast, authInitialized]);

  return {
    session,
    user,
    userRole,
    profile,
    isLoading,
    setUser,
    setSession,
    setUserRole,
    setProfile,
    setIsLoading,
    authInitialized
  };
}
