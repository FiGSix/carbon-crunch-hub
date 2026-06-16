
import { createContext, useContext, ReactNode, useEffect, useState, useRef } from 'react';
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
  isSuperPartner: boolean;
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

// Global profile cache to prevent duplicate fetches across re-renders
let profileCache: { data: UserProfile | null; userId: string; timestamp: number } | null = null;
let profileLoadingPromise: Promise<void> | null = null;

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [userRole, setUserRole] = useState<UserRole | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const loadProfile = async (userId: string) => {
    // Check cache first (5 second TTL)
    if (profileCache && 
        profileCache.userId === userId && 
        Date.now() - profileCache.timestamp < 5000) {
      setProfile(profileCache.data);
      setUserRole(profileCache.data?.role);
      return;
    }

    // If already loading, wait for that promise
    if (profileLoadingPromise) {
      await profileLoadingPromise;
      return;
    }

    // Start new load
    profileLoadingPromise = (async () => {
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
            intro_video_viewed_at,
            super_partner_status,
            can_create_proposals
          `)
          .eq('id', userId)
          .single();

        if (error) {
          profileCache = { data: null, userId, timestamp: Date.now() };
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
          intro_video_viewed_at: data.intro_video_viewed_at,
          super_partner_status: data.super_partner_status ?? null,
          can_create_proposals: data.can_create_proposals ?? false
        };

        profileCache = { data: userProfile, userId, timestamp: Date.now() };
        setProfile(userProfile);
        setUserRole(userProfile.role);
      } catch {
        profileCache = { data: null, userId, timestamp: Date.now() };
        setProfile(null);
        setUserRole(undefined);
      } finally {
        profileLoadingPromise = null;
      }
    })();

    await profileLoadingPromise;
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
          // Load profile with error handling to prevent blocking initialization
          loadProfile(nextUser.id).catch((err) => {
            console.error('[Auth] Profile load failed during initialization:', err);
            setAuthError('Profile load failed');
          });
        }
        // Always set initialization state, regardless of profile load status
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


  const contextValue: AuthContextType = {
    user,
    session,
    profile,
    userRole,
    isLoading,
    isAdmin: userRole === 'admin',
    isSuperPartner: userRole === 'super_partner',
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
