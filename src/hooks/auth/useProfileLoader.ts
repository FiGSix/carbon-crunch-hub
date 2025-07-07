
import { useCallback } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { UserProfile, UserRole } from '@/contexts/auth/types';
import { authCache } from '@/lib/cache/UnifiedCache';

interface UseProfileLoaderProps {
  user: User | null;
  isUnmountedRef: React.MutableRefObject<boolean>;
  updateProfileState: (profile: UserProfile | null) => void;
}

export function useProfileLoader({ user, isUnmountedRef, updateProfileState }: UseProfileLoaderProps) {
  
  const createFallbackProfile = useCallback(async (userId: string): Promise<UserProfile> => {
    // Try to determine the user's role by checking JWT metadata or existing data
    let userRole: UserRole = 'client'; // Default fallback
    
    try {
      // Check if role is in JWT metadata
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser?.app_metadata?.role) {
        userRole = authUser.app_metadata.role as UserRole;
      } else if (authUser?.user_metadata?.role) {
        userRole = authUser.user_metadata.role as UserRole;
      }
    } catch (error) {
      console.warn('Could not retrieve user metadata for role detection');
    }

    return {
      id: userId,
      first_name: null,
      last_name: null,
      email: user?.email || '',
      phone: null,
      company_name: null,
      company_logo_url: null,
      avatar_url: null,
      role: userRole,
      terms_accepted_at: null,
      created_at: new Date().toISOString(),
      intro_video_viewed: false,
      intro_video_viewed_at: null
    };
  }, [user?.email]);

  const loadUserProfileWithFallback = useCallback(async (userId: string) => {
    try {
      // Check cache first
      const cached = authCache.get<UserProfile>(userId);
      if (cached) {
        updateProfileState(cached);
        return;
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
        const fallbackProfile = await createFallbackProfile(userId);
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
        
      }
    } catch (error) {
      // Create fallback profile on any exception
      const fallbackProfile = await createFallbackProfile(userId);
      updateProfileState(fallbackProfile);
    }
  }, [user?.email, isUnmountedRef, updateProfileState, createFallbackProfile]);

  const refreshUser = useCallback(async () => {
    if (user?.id) {
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
