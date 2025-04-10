
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

  useEffect(() => {
    // Set up initial session and user
    async function fetchUserSession() {
      setIsLoading(true)
      try {
        // Get current session
        const { data: { session: currentSession } } = await supabase.auth.getSession()
        setSession(currentSession)

        if (currentSession?.user) {
          setUser(currentSession.user)
          
          // Get user role from metadata
          const { role } = await getUserRole()
          setUserRole(role)
          
          // Get user profile from database
          const { profile: userProfile } = await getProfile()
          setProfile(userProfile)
        }
      } catch (error) {
        console.error('Error fetching session:', error)
        toast({
          title: 'Error',
          description: 'Failed to fetch user session',
          variant: 'destructive',
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchUserSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        console.log('Auth state changed:', event)
        setSession(currentSession)
        setUser(currentSession?.user ?? null)
        
        if (currentSession?.user) {
          // Fetch in sequence to prevent race conditions
          const { role } = await getUserRole()
          setUserRole(role)
          
          // Small delay to ensure profile is created in the database
          setTimeout(async () => {
            const { profile: userProfile } = await getProfile()
            setProfile(userProfile)
          }, 500)
        } else {
          setUserRole(null)
          setProfile(null)
        }
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [toast])

  const refreshUser = async () => {
    setIsLoading(true)
    try {
      const { user: currentUser } = await getCurrentUser()
      setUser(currentUser)
      
      if (currentUser) {
        const { role } = await getUserRole()
        setUserRole(role)
        
        const { profile: userProfile } = await getProfile()
        setProfile(userProfile)
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
