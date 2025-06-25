
import { useCallback } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { UserProfile, UserRole } from '@/contexts/auth/types';
import { authCache } from './authCache';

interface UseProfileLoaderProps {
  user: User | null;
  isUnmountedRef: React.MutableRefObject<boolean>;
  updateProfileState: (profile: UserProfile | null) => void;
}

export function useProfileLoader({ user, isUnmountedRef, updateProfileState }: UseProfileLoaderProps) {
  
  const createFallbackProfile = useCallback((userId: string): UserProfile => {
    return {
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
  }, [user?.email]);

  const loadUserProfileWithFallback = useCallback(async (userId: string) => {
    try {
      // Check cache first
      const cached = authCache.get(userId);
      if (cached) {
        if (import.meta.env.DEV) {
          console.log('📊 Using cached profile for:', userId);
        }
        updateProfileState(cached);
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
        const fallbackProfile = createFallbackProfile(userId);
        updateProfileState(fallbackProfile);
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
        authCache.set(userId, userProfile);
        updateProfileState(userProfile);
        
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
      const fallbackProfile = createFallbackProfile(userId);
      updateProfileState(fallbackProfile);
    }
  }, [user?.email, isUnmountedRef, updateProfileState, createFallbackProfile]);

  const refreshUser = useCallback(async () => {
    if (user?.id) {
      if (import.meta.env.DEV) {
        console.log('🔄 Refreshing user profile');
      }
      // Clear cache to force fresh data
      authCache.delete(user.id);
      await loadUserProfileWithFallback(user.id);
    }
  }, [user?.id, loadUserProfileWithFallback]);

  return {
    loadUserProfileWithFallback,
    refreshUser
  };
}
