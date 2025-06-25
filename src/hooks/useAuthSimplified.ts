
import { useState, useEffect, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { UserProfile, UserRole } from '@/contexts/auth/types';

/**
 * Simplified auth hook with fixed session timeout and improved redirect logic
 */
export function useAuthSimplified() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [userRole, setUserRole] = useState<UserRole | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);

  // Prevent memory leaks and race conditions
  const isUnmountedRef = useRef(false);
  const profileCacheRef = useRef<Map<string, { profile: UserProfile; timestamp: number }>>(new Map());
  
  // Cache profile for 5 minutes to reduce database calls
  const PROFILE_CACHE_TTL = 5 * 60 * 1000;

  // Initialize auth state with improved error handling
  useEffect(() => {
    isUnmountedRef.current = false;
    let timeoutId: NodeJS.Timeout;

    const initializeAuth = async () => {
      try {
        console.log('🚀 Initializing auth with improved session handling...');
        const startTime = performance.now();
        
        // Get initial session with improved timeout handling
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise<never>((_, reject) => {
          timeoutId = setTimeout(() => reject(new Error('Session fetch timeout after 8 seconds')), 8000);
        });
        
        try {
          const { data: { session }, error } = await Promise.race([
            sessionPromise,
            timeoutPromise
          ]);
          
          // Clear timeout if successful
          if (timeoutId) clearTimeout(timeoutId);
          
          if (error) {
            console.error('❌ Error getting initial session:', error);
            return;
          }
          
          if (isUnmountedRef.current) return;

          // Update state in batches to prevent multiple re-renders
          setSession(session);
          setUser(session?.user ?? null);
          
          if (session?.user) {
            console.log('✅ Initial session found, loading user profile');
            setTimeout(() => {
              if (!isUnmountedRef.current) {
                loadUserProfileOptimized(session.user.id);
              }
            }, 0);
          } else {
            console.log('ℹ️ No initial session found');
          }
          
          const endTime = performance.now();
          console.log(`⚡ Auth initialization completed in ${(endTime - startTime).toFixed(2)}ms`);
        } catch (timeoutError) {
          console.warn('⚠️ Session fetch timed out, continuing without session');
          if (timeoutId) clearTimeout(timeoutId);
        }
      } catch (error) {
        console.error('💥 Error initializing auth:', error);
      } finally {
        if (!isUnmountedRef.current) {
          setIsLoading(false);
          setIsInitialized(true);
        }
      }
    };

    // Set up auth state listener with improved error handling
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (isUnmountedRef.current) return;

      console.log('🔔 Auth state changed:', event, 'User ID:', session?.user?.id);
      
      // Batch state updates to prevent multiple re-renders
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        console.log('👤 Loading profile for authenticated user');
        // Defer profile loading to prevent blocking the auth flow
        setTimeout(() => {
          if (!isUnmountedRef.current) {
            loadUserProfileOptimized(session.user.id);
          }
        }, 0);
      } else {
        console.log('🚪 User signed out, clearing profile');
        setProfile(null);
        setUserRole(undefined);
        profileCacheRef.current.clear();
      }

      if (event === 'SIGNED_OUT') {
        console.log('🧹 Clearing all auth state');
        setProfile(null);
        setUserRole(undefined);
        profileCacheRef.current.clear();
      }
    });

    initializeAuth();

    return () => {
      isUnmountedRef.current = true;
      subscription.unsubscribe();
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  const loadUserProfileOptimized = async (userId: string) => {
    try {
      // Check cache first
      const cached = profileCacheRef.current.get(userId);
      if (cached && Date.now() - cached.timestamp < PROFILE_CACHE_TTL) {
        console.log('📊 Using cached profile for:', userId);
        setProfile(cached.profile);
        setUserRole(cached.profile.role);
        return;
      }

      console.log('📊 Loading user profile for:', userId);
      const startTime = performance.now();
      
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

      if (data && !isUnmountedRef.current) {
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

        // Cache the profile
        profileCacheRef.current.set(userId, {
          profile: userProfile,
          timestamp: Date.now()
        });

        setProfile(userProfile);
        setUserRole(userProfile.role);
        
        const endTime = performance.now();
        console.log(`✅ Profile loaded in ${(endTime - startTime).toFixed(2)}ms, role:`, userProfile.role);
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
      // Clear cache to force fresh data
      profileCacheRef.current.delete(user.id);
      await loadUserProfileOptimized(user.id);
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
      profileCacheRef.current.clear();
      
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
