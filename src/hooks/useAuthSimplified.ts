
import { useState, useEffect, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { UserProfile, UserRole } from '@/contexts/auth/types';

/**
 * Simplified auth hook with improved error handling and fallback mechanisms
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
        if (import.meta.env.DEV) {
          console.log('🚀 Initializing auth with fixed RLS policies...');
        }
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
            // Don't throw here - let the app continue without session
          }
          
          if (isUnmountedRef.current) return;

          // Update state in batches to prevent multiple re-renders
          setSession(session);
          setUser(session?.user ?? null);
          
          if (session?.user) {
            if (import.meta.env.DEV) {
              console.log('✅ Initial session found, loading user profile');
            }
            // Load profile but don't block initialization
            loadUserProfileWithFallback(session.user.id);
          } else {
            if (import.meta.env.DEV) {
              console.log('ℹ️ No initial session found');
            }
          }
          
          const endTime = performance.now();
          if (import.meta.env.DEV) {
            console.log(`⚡ Auth initialization completed in ${(endTime - startTime).toFixed(2)}ms`);
          }
        } catch (timeoutError) {
          if (import.meta.env.DEV) {
            console.warn('⚠️ Session fetch timed out, continuing without session');
          }
          if (timeoutId) clearTimeout(timeoutId);
          // Continue with null session instead of failing
        }
      } catch (error) {
        // Don't throw here - let the app continue with null session
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

      if (import.meta.env.DEV) {
        console.log('🔔 Auth state changed:', event);
      }
      
      // Batch state updates to prevent multiple re-renders
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        if (import.meta.env.DEV) {
          console.log('👤 Loading profile for authenticated user');
        }
        loadUserProfileWithFallback(session.user.id);
      } else {
        if (import.meta.env.DEV) {
          console.log('🚪 User signed out, clearing profile');
        }
        setProfile(null);
        setUserRole(undefined);
        profileCacheRef.current.clear();
      }

      if (event === 'SIGNED_OUT') {
        if (import.meta.env.DEV) {
          console.log('🧹 Clearing all auth state');
        }
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

  const loadUserProfileWithFallback = async (userId: string) => {
    try {
      // Check cache first
      const cached = profileCacheRef.current.get(userId);
      if (cached && Date.now() - cached.timestamp < PROFILE_CACHE_TTL) {
        if (import.meta.env.DEV) {
          console.log('📊 Using cached profile for:', userId);
        }
        setProfile(cached.profile);
        setUserRole(cached.profile.role);
        return;
      }

      if (import.meta.env.DEV) {
        console.log('📊 Loading user profile with fixed RLS for:', userId);
      }
      const startTime = performance.now();
      
      // Use the fixed RLS policies - simple self-access only
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      const endTime = performance.now();

      if (error) {
        // Create a fallback profile if none exists
        if (import.meta.env.DEV) {
          console.log('🔧 Creating fallback profile for user:', userId);
        }
        const fallbackProfile: UserProfile = {
          id: userId,
          first_name: null,
          last_name: null,
          email: user?.email || '',
          phone: null,
          company_name: null,
          company_logo_url: null,
          avatar_url: null,
          role: 'client', // Default role
          terms_accepted_at: null,
          created_at: new Date().toISOString(),
          intro_video_viewed: false,
          intro_video_viewed_at: null
        };
        
        setProfile(fallbackProfile);
        setUserRole('client');
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
        
        if (import.meta.env.DEV) {
          console.log(`✅ Profile loaded successfully in ${(endTime - startTime).toFixed(2)}ms`, {
            userId,
            role: userProfile.role,
            hasFirstName: !!userProfile.first_name,
            hasLastName: !!userProfile.last_name
          });
        }
      }
    } catch (error) {
      // Create fallback profile on any exception
      if (import.meta.env.DEV) {
        console.log('🔧 Creating fallback profile due to exception for user:', userId);
      }
      const fallbackProfile: UserProfile = {
        id: userId,
        first_name: null,
        last_name: null,
        email: user?.email || '',
        phone: null,
        company_name: null,
        company_logo_url: null,
        avatar_url: null,
        role: 'client',
        terms_accepted_at: null,
        created_at: new Date().toISOString(),
        intro_video_viewed: false,
        intro_video_viewed_at: null
      };
      
      setProfile(fallbackProfile);
      setUserRole('client');
    }
  };

  const refreshUser = async () => {
    if (user?.id) {
      if (import.meta.env.DEV) {
        console.log('🔄 Refreshing user profile');
      }
      // Clear cache to force fresh data
      profileCacheRef.current.delete(user.id);
      await loadUserProfileWithFallback(user.id);
    }
  };

  const signOut = async () => {
    try {
      if (import.meta.env.DEV) {
        console.log('🚪 Signing out user');
      }
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      // Clear all state immediately
      setUser(null);
      setSession(null);
      setProfile(null);
      setUserRole(undefined);
      profileCacheRef.current.clear();
      
      if (import.meta.env.DEV) {
        console.log('✅ Sign out completed successfully');
      }
    } catch (error) {
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
