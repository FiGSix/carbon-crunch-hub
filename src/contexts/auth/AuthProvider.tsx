
import { createContext, useState, useEffect, ReactNode } from 'react'
import { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase/client'
import { getCurrentUser, getUserRole, refreshSession } from '@/lib/supabase/auth'
import { getProfile } from '@/lib/supabase/profile'
import { useToast } from '@/hooks/use-toast'
import { AuthContextType, UserProfile, UserRole } from './types'

export const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [userRole, setUserRole] = useState<UserRole | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const { toast } = useToast()

  // Optimized function to fetch user profile data
  const fetchUserData = async (currentUser: User, skipLoading = false) => {
    if (!skipLoading) {
      setIsLoading(true)
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
      }
      
      if (!profileResult.error && profileResult.profile) {
        setProfile(profileResult.profile);
      } else if (profileResult.error) {
        console.error("Error fetching user profile:", profileResult.error);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      if (!skipLoading) {
        setIsLoading(false)
      }
    }
  };

  useEffect(() => {
    console.log("Initializing auth context");
    let subscription: { unsubscribe: () => void } | null = null;
    
    async function initAuth() {
      setIsLoading(true)
      
      try {
        // First check if there's an existing session
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        
        // Set up auth state listener
        subscription = supabase.auth.onAuthStateChange(
          (event, newSession) => {
            console.log('Auth state changed:', event, 'User ID:', newSession?.user?.id);
            
            setSession(newSession);
            setUser(newSession?.user || null);
            
            if (newSession?.user) {
              // For SIGNED_IN events, fetch role and profile
              if (event === 'SIGNED_IN') {
                // Use setTimeout to avoid recursive auth state changes
                setTimeout(() => {
                  fetchUserData(newSession.user, true);
                }, 0);
              }
            } else {
              // Clear all state when signed out
              setUserRole(null);
              setProfile(null);
            }
          }
        ).data.subscription;
        
        // Handle initial session if it exists
        if (currentSession?.user) {
          console.log("Initial session found, user ID:", currentSession.user.id);
          setSession(currentSession);
          setUser(currentSession.user);
          
          await fetchUserData(currentSession.user, true);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        toast({
          title: 'Error',
          description: 'Failed to initialize authentication',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    }
    
    initAuth();
    
    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [toast]);

  const refreshUser = async () => {
    setIsLoading(true);
    try {
      console.log("Refreshing user data...");
      
      // Try refreshing the session first
      const { session: refreshedSession, error: refreshError } = await refreshSession();
      
      if (refreshError) {
        console.log("Session refresh failed, trying getCurrentUser");
        const { user: currentUser } = await getCurrentUser();
        
        if (currentUser) {
          setUser(currentUser);
          await fetchUserData(currentUser, true);
          console.log("User data refreshed via getCurrentUser");
        } else {
          console.log("Could not get current user, user may be signed out");
        }
      } else if (refreshedSession) {
        setSession(refreshedSession);
        setUser(refreshedSession.user);
        await fetchUserData(refreshedSession.user, true);
        console.log("User data refreshed via session refresh");
      }
    } catch (error) {
      console.error('Error refreshing user:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Debug function to get auth state information
  const debugAuthState = async () => {
    try {
      // Check session
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      
      // Check user
      const { user: currentUser, error: userError } = await getCurrentUser();
      
      // Check profile
      const { profile: currentProfile, error: profileError } = await getProfile();
      
      // Check role
      const { role: currentRole, error: roleError } = await getUserRole();
      
      // Compile all information
      const debugInfo = {
        sessionExists: !!currentSession,
        sessionExpires: currentSession?.expires_at ? new Date(currentSession.expires_at * 1000).toISOString() : 'N/A',
        userExists: !!currentUser,
        userId: currentUser?.id || 'none',
        userEmail: currentUser?.email || 'none',
        userError: userError?.message || 'none',
        profileExists: !!currentProfile,
        profileEmail: currentProfile?.email || 'none',
        profileRole: currentProfile?.role || 'none',
        profileError: profileError?.message || 'none',
        roleFromFunction: currentRole || 'none',
        contextUser: !!user,
        contextUserRole: userRole || 'none',
        contextProfile: !!profile
      };
      
      console.log("Auth debug information:", debugInfo);
      
      return JSON.stringify(debugInfo, null, 2);
    } catch (error) {
      console.error("Error gathering debug information:", error);
      return `Error gathering debug info: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  };

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
