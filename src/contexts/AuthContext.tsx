
import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { Session, User } from '@supabase/supabase-js'
import { supabase, UserRole, getCurrentUser, getUserRole } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'

interface AuthContextType {
  session: Session | null
  user: User | null
  userRole: UserRole | null
  isLoading: boolean
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [userRole, setUserRole] = useState<UserRole | null>(null)
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
        setSession(currentSession)
        setUser(currentSession?.user ?? null)
        
        if (currentSession?.user) {
          const { role } = await getUserRole()
          setUserRole(role)
        } else {
          setUserRole(null)
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
      }
    } catch (error) {
      console.error('Error refreshing user:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AuthContext.Provider value={{ session, user, userRole, isLoading, refreshUser }}>
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
