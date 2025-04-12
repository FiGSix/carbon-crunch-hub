
import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { Session, User } from '@supabase/supabase-js'
import { supabase, UserRole, getCurrentUser, getUserRole, getProfile } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'

interface UserProfile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  company_name: string | null;
  email: string;
  role: UserRole;
  terms_accepted_at: string | null;
  created_at: string;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  userRole: UserRole | null;
  profile: UserProfile | null;
  isLoading: boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

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
    let subscription: { unsubscribe: () => void } | null = null;
    
    async function initAuth() {
      setIsLoading(true)
      
      try {
        // First check if there's an existing session
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        
        // Set up auth state listener
        const { data } = supabase.auth.onAuthStateChange(
          async (event, newSession) => {
            console.log('Auth state changed:', event, 'User ID:', newSession?.user?.id);
            
            if (newSession?.user) {
              // Update session and user immediately
              setSession(newSession);
              setUser(newSession.user);
              
              // Fetch profile data without updating loading state
              if (event === 'SIGNED_IN') {
                // Only fetch on sign in to avoid race conditions
                setTimeout(() => {
                  fetchUserData(newSession.user, true);
                }, 0);
              }
            } else {
              setSession(null);
              setUser(null);
              setUserRole(null);
              setProfile(null);
            }
          }
        );
        
        subscription = data.subscription;
        
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
      const { user: currentUser } = await getCurrentUser();
      
      if (currentUser) {
        setUser(currentUser);
        await fetchUserData(currentUser, true);
      }
    } catch (error) {
      console.error('Error refreshing user:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      session, 
      user, 
      userRole, 
      profile, 
      isLoading, 
      refreshUser 
    }}>
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
