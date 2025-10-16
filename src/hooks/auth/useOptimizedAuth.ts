import React, { useState, useEffect, useCallback, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { UserProfile, UserRole } from '@/contexts/auth/types';
import { authCache } from '@/lib/cache/UnifiedCache';
import { useAuthStateSync } from './useAuthStateSync';
import { devLogger } from '@/lib/performance/ConsoleReplacementUtility';

interface OptimizedAuthState {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  userRole: UserRole | undefined;
  isLoading: boolean;
  isAuthenticated: boolean;
  isInitialized: boolean;
  authError: string | null;
}

interface OptimizedAuthActions {
  refreshUser: () => Promise<void>;
  refreshAuth: () => Promise<void>;
  signOut: () => Promise<void>;
}

/**
 * Optimized authentication hook with enhanced caching and performance
 */
export function useOptimizedAuth(): OptimizedAuthState & OptimizedAuthActions {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [userRole, setUserRole] = useState<UserRole | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  
  const initializationPromise = useRef<Promise<void> | null>(null);
  const profileCache = useRef(new Map<string, { profile: UserProfile; timestamp: number }>());
  
  // Enhanced authentication check with session validation
  const isAuthenticated = !!(
    user && 
    session && 
    session.expires_at && 
    new Date(session.expires_at * 1000) > new Date()
  );

  function handleAuthStateChange(newSession: Session | null) {
    // Note: Console logging removed for performance optimization

    setSession(newSession);
    setUser(newSession?.user ?? null);
    setAuthError(null);

    if (newSession?.user) {
      loadUserProfile(newSession.user.id);
    } else {
      setProfile(null);
      setUserRole(undefined);
      // Clear auth-related cache
      authCache.deletePattern('auth_');
      authCache.deletePattern('profile_');
      profileCache.current.clear();
    }
  }

  // Use auth state sync for better reliability
  const { validateAndSyncSession } = useAuthStateSync({
    session,
    onAuthStateChange: handleAuthStateChange
  });

  const loadUserProfile = useCallback(async (userId: string) => {
    if (!userId) return;

    try {
      // Check memory cache first
      const cached = profileCache.current.get(userId);
      if (cached && Date.now() - cached.timestamp < 5 * 60 * 1000) { // 5 minutes
        setProfile(cached.profile);
        setUserRole(cached.profile.role as UserRole);
        return;
      }

      // Check persistent cache
      const cacheKey = `profile_${userId}`;
      const cachedProfile = authCache.get<UserProfile>(cacheKey);
      
      if (cachedProfile) {
        setProfile(cachedProfile);
        setUserRole(cachedProfile.role as UserRole);
        profileCache.current.set(userId, { 
          profile: cachedProfile, 
          timestamp: Date.now() 
        });
        return;
      }

      // Fetch from database
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        devLogger.auth.error('Error loading profile:', error);
        setAuthError('Failed to load user profile');
        return;
      }

      if (profileData) {
        const userProfile: UserProfile = {
          id: profileData.id,
          email: profileData.email,
          role: profileData.role as UserRole,
          first_name: profileData.first_name,
          last_name: profileData.last_name,
          company_name: profileData.company_name,
          phone: profileData.phone,
          avatar_url: profileData.avatar_url,
          company_logo_url: profileData.company_logo_url,
          agent_status: profileData.agent_status,
          created_at: profileData.created_at,
          terms_accepted_at: profileData.terms_accepted_at,
          intro_video_viewed: profileData.intro_video_viewed,
          intro_video_viewed_at: profileData.intro_video_viewed_at
        };

        setProfile(userProfile);
        setUserRole(userProfile.role);
        
        // Cache with different TTLs based on data type
        authCache.set(cacheKey, userProfile, 15 * 60 * 1000); // 15 minutes
        profileCache.current.set(userId, { 
          profile: userProfile, 
          timestamp: Date.now() 
        });
      }
    } catch (error) {
      devLogger.auth.error('Error in loadUserProfile:', error);
      setAuthError('Profile loading failed');
    }
  }, []);

  const refreshUser = useCallback(async () => {
    if (!session?.user?.id) return;
    
    // Clear cache and reload
    const userId = session.user.id;
    authCache.delete(`profile_${userId}`);
    profileCache.current.delete(userId);
    
    await loadUserProfile(userId);
  }, [session?.user?.id, loadUserProfile]);

  const refreshAuth = useCallback(async () => {
    try {
      setIsLoading(true);
      setAuthError(null);
      
      const { data, error } = await supabase.auth.refreshSession();
      
      if (error) {
        setAuthError(error.message);
        return;
      }
      
      if (data.session) {
        handleAuthStateChange(data.session);
      }
    } catch (error: any) {
      setAuthError(error.message || 'Failed to refresh authentication');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Clear all cache
      authCache.clear();
      profileCache.current.clear();
      
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        setAuthError(error.message);
      } else {
        // Reset all state
        setUser(null);
        setSession(null);
        setProfile(null);
        setUserRole(undefined);
        setAuthError(null);
      }
    } catch (error: any) {
      setAuthError(error.message || 'Sign out failed');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initialize authentication
  useEffect(() => {
    let subscription: any;

    const initialize = async () => {
      try {
        setIsLoading(true);

        // Set up auth state listener FIRST
        const { data } = supabase.auth.onAuthStateChange(
          (event, session) => {
            // Note: Console logging removed for performance optimization
            handleAuthStateChange(session);
          }
        );
        subscription = data.subscription;

        // THEN check for existing session
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          setAuthError(error.message);
        } else {
          handleAuthStateChange(session);
        }

        setIsInitialized(true);
      } catch (error: any) {
        setAuthError(error.message || 'Authentication initialization failed');
        setIsInitialized(true);
      } finally {
        setIsLoading(false);
      }
    };

    initialize();

    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, []);

  // Note: Enhanced logging removed for performance optimization

  return {
    user,
    session,
    profile,
    userRole,
    isLoading,
    isAuthenticated,
    isInitialized,
    authError,
    refreshUser,
    refreshAuth,
    signOut
  };
}