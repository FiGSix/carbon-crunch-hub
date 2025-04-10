
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

  // Function to fetch user profile data efficiently
  const fetchUserData = async (currentUser: User) => {
    try {
      // Fetch user role and profile in parallel
      const [roleResult, profileResult] = await Promise.all([
        getUserRole(),
        getProfile()
      ]);
      
      setUserRole(roleResult.role);
      
      if (profileResult.error) {
        console.error("Error fetching user profile:", profileResult.error);
      } else {
        setProfile(profileResult.profile);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  useEffect(() => {
    // Set up initial session and user
    async function fetchUserSession() {
      setIsLoading(true)
      try {
        // Listen for auth changes before getting session to avoid race conditions
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event, currentSession) => {
            console.log('Auth state changed:', event, 'User ID:', currentSession?.user?.id)
            
            if (currentSession?.user) {
              setSession(currentSession)
              setUser(currentSession.user)
              
              // Only fetch profile and role data if they haven't been loaded
              if (!userRole || !profile) {
                await fetchUserData(currentSession.user);
              }
            } else {
              setSession(null)
              setUser(null)
              setUserRole(null)
              setProfile(null)
            }
            
            // Only set loading to false after initial session check
            setIsLoading(false)
          }
        )
        
        // Get current session
        const { data: { session: currentSession } } = await supabase.auth.getSession()
        console.log("Initial session check:", currentSession ? "Session exists" : "No session")
        
        if (currentSession?.user) {
          console.log("User found in session, user ID:", currentSession.user.id)
          setSession(currentSession)
          setUser(currentSession.user)
          await fetchUserData(currentSession.user);
        }
        
        setIsLoading(false)

        return () => {
          subscription.unsubscribe()
        }
      } catch (error) {
        console.error('Error fetching session:', error)
        toast({
          title: 'Error',
          description: 'Failed to fetch user session',
          variant: 'destructive',
        })
        setIsLoading(false)
      }
    }

    fetchUserSession()
  }, [toast])

  const refreshUser = async () => {
    setIsLoading(true)
    try {
      console.log("Refreshing user data...")
      const { user: currentUser } = await getCurrentUser()
      
      if (currentUser) {
        setUser(currentUser)
        await fetchUserData(currentUser);
      }
    } catch (error) {
      console.error('Error refreshing user:', error)
    } finally {
      setIsLoading(false)
    }
  }

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
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
