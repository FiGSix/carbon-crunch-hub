
import { createContext, useContext, ReactNode, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { UserProfile, UserRole } from './types';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  userRole: UserRole | undefined;
  isLoading: boolean;
  isAdmin: boolean;
  isAuthenticated: boolean;
  isInitialized: boolean;
  authError: string | null;
  refreshUser: () => Promise<void>;
  refreshAuth: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

// Static state tracker to reduce console spam
let lastLoggedState: any = null;

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [userRole, setUserRole] = useState<UserRole | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const loadProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          email,
          first_name,
          last_name,
          role,
          company_name,
          phone,
          avatar_url,
          company_logo_url,
          agent_status,
          terms_accepted_at,
          created_at,
          intro_video_viewed,
          intro_video_viewed_at
        `)
        .eq('id', userId)
        .single();

      if (error) {
        setProfile(null);
        setUserRole(undefined);
        return;
      }

      const userProfile: UserProfile = {
        id: data.id,
        first_name: data.first_name,
        last_name: data.last_name,
        email: data.email,
        phone: data.phone,
        company_name: data.company_name,
        company_logo_url: data.company_logo_url,
        avatar_url: data.avatar_url,
        role: data.role as UserRole,
        agent_status: data.agent_status,
        terms_accepted_at: data.terms_accepted_at,
        created_at: data.created_at,
        intro_video_viewed: data.intro_video_viewed,
        intro_video_viewed_at: data.intro_video_viewed_at
      };

      setProfile(userProfile);
      setUserRole(userProfile.role);
    } catch {
      setProfile(null);
      setUserRole(undefined);
    }
  };

  useEffect(() => {
    // Listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession);
      const nextUser = newSession?.user ?? null;
      setUser(nextUser);
      if (nextUser) {
        // Defer to avoid deadlocks per best practices
        setTimeout(() => {
          loadProfile(nextUser.id);
        }, 0);
      } else {
        setProfile(null);
        setUserRole(undefined);
      }
    });

    // Then initial session
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        setSession(session);
        const nextUser = session?.user ?? null;
        setUser(nextUser);
        if (nextUser) {
          loadProfile(nextUser.id);
        }
        setIsLoading(false);
        setIsInitialized(true);
      })
      .catch((err) => {
        setAuthError(err?.message ?? 'Auth initialization failed');
        setIsLoading(false);
        setIsInitialized(true);
      });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const refreshUser = async () => {
    if (user?.id) {
      await loadProfile(user.id);
    }
  };

  const refreshAuth = async () => {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) {
      setAuthError(error.message);
    }
    setSession(session);
    const nextUser = session?.user ?? null;
    setUser(nextUser);
    if (nextUser) {
      await loadProfile(nextUser.id);
    } else {
      setProfile(null);
      setUserRole(undefined);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setUserRole(undefined);
  };

  const isAuthenticated = !!(
    user &&
    session &&
    session.expires_at &&
    new Date(session.expires_at * 1000) > new Date()
  );

  // Reduced logging frequency to prevent console spam
  if (import.meta.env.DEV && isInitialized && !isLoading) {
    const currentState = {
      hasUser: !!user,
      hasSession: !!session,
      hasProfile: !!profile,
      userRole,
      isAuthenticated,
      sessionValid: session ? (new Date(session.expires_at * 1000) > new Date()) : false,
    };

    if (!lastLoggedState || JSON.stringify(lastLoggedState) !== JSON.stringify(currentState)) {
      console.log('🔄 AuthContext state update:', {
        ...currentState,
        isInitialized,
        isLoading,
        authError,
        sessionExpiresAt: session?.expires_at ? new Date(session.expires_at * 1000).toISOString() : 'none',
        profileId: profile?.id || 'none'
      });
      lastLoggedState = currentState;
    }
  }

  const contextValue: AuthContextType = {
    user,
    session,
    profile,
    userRole,
    isLoading,
    isAdmin: userRole === 'admin',
    isAuthenticated,
    isInitialized,
    authError,
    refreshUser,
    refreshAuth,
    signOut,
  };

  return (
    <AuthContext.Provider value={contextValue}>
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
