
import { useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { UserProfile, UserRole } from '@/contexts/auth/types';

/**
 * Simplified auth hook that provides clean, reliable auth state management
 * Fixed to eliminate infinite recursion and race conditions
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
        console.log('🔄 Initializing simplified auth...');
        
        // Get initial session
        const { data: { session: initialSession }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('❌ Error getting initial session:', error);
          if (mounted) {
            setIsLoading(false);
            setIsInitialized(true);
          }
          return;
        }
        
        if (mounted) {
          setSession(initialSession);
          setUser(initialSession?.user ?? null);
          
          if (initialSession?.user) {
            console.log('✅ Initial session found, loading user profile');
            await loadUserProfile(initialSession.user.id);
          } else {
            console.log('ℹ️ No initial session found');
          }
          
          setIsLoading(false);
          setIsInitialized(true);
        }
      } catch (error) {
        console.error('💥 Error initializing auth:', error);
        if (mounted) {
          setIsLoading(false);
          setIsInitialized(true);
        }
      }
    };

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      console.log('🔔 Auth state changed:', event, 'User ID:', session?.user?.id);
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        console.log('👤 Loading profile for authenticated user');
        await loadUserProfile(session.user.id);
      } else {
        console.log('🚪 User signed out, clearing profile');
        setProfile(null);
        setUserRole(undefined);
      }

      if (event === 'SIGNED_OUT') {
        console.log('🧹 Clearing all auth state');
        // Clear everything on sign out
        setProfile(null);
        setUserRole(undefined);
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
      console.log('📊 Loading user profile for:', userId);
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('❌ Error loading profile:', error);
        setProfile(null);
        setUserRole(undefined);
        return;
      }

      if (data) {
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
          terms_accepted_at: data.terms_accepted_at,
          created_at: data.created_at,
          intro_video_viewed: data.intro_video_viewed,
          intro_video_viewed_at: data.intro_video_viewed_at
        };

        setProfile(userProfile);
        setUserRole(userProfile.role);
        console.log('✅ User profile loaded successfully, role:', userProfile.role);
      }
    } catch (error) {
      console.error('💥 Exception loading profile:', error);
      setProfile(null);
      setUserRole(undefined);
    }
  };

  const refreshUser = async () => {
    if (user?.id) {
      console.log('🔄 Refreshing user profile');
      await loadUserProfile(user.id);
    }
  };

  const signOut = async () => {
    try {
      console.log('🚪 Signing out user');
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      // Clear all state immediately
      setUser(null);
      setSession(null);
      setProfile(null);
      setUserRole(undefined);
      
      console.log('✅ Sign out completed successfully');
    } catch (error) {
      console.error('❌ Error signing out:', error);
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
