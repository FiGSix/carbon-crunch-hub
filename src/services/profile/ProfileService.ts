
import { supabase } from '@/integrations/supabase/client';
import { UserProfile, UserRole } from '@/contexts/auth/types';
import { ProfileOperations, ProfileUpdateResult, ProfileServiceDependencies } from './types';
import { CACHE_KEYS, CACHE_TTL } from '../cache/types';

// Helper function to safely cast role
function castUserRole(role: string | null | undefined): UserRole | undefined {
  if (!role) return undefined;
  if (['client', 'agent', 'admin'].includes(role)) {
    return role as UserRole;
  }
  return undefined;
}

export class ProfileService implements ProfileOperations {
  constructor(private dependencies: ProfileServiceDependencies) {}

  async getProfile(userId: string, forceRefresh = false): Promise<UserProfile | null> {
    const cacheKey = CACHE_KEYS.PROFILE(userId);
    
    if (!forceRefresh) {
      const cached = this.dependencies.cache.get<UserProfile>(cacheKey);
      if (cached) return cached;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;

      if (data) {
        const profile: UserProfile = {
          id: data.id,
          first_name: data.first_name,
          last_name: data.last_name,
          email: data.email,
          phone: data.phone,
          company_name: data.company_name,
          company_logo_url: data.company_logo_url,
          avatar_url: data.avatar_url,
          role: castUserRole(data.role),
          terms_accepted_at: data.terms_accepted_at,
          created_at: data.created_at,
          intro_video_viewed: data.intro_video_viewed,
          intro_video_viewed_at: data.intro_video_viewed_at
        };

        this.dependencies.cache.set(cacheKey, profile, CACHE_TTL.MEDIUM);
        return profile;
      }

      return null;
    } catch (error) {
      console.error('Error fetching profile:', error);
      return null;
    }
  }

  async updateProfile(userId: string, updates: Partial<UserProfile>): Promise<ProfileUpdateResult> {
    try {
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId);

      if (error) throw error;

      // Invalidate profile cache
      this.dependencies.cache.invalidate(CACHE_KEYS.PROFILE(userId));
      
      return { success: true };
    } catch (error: any) {
      console.error('Error updating profile:', error);
      return { success: false, error: error.message };
    }
  }
}
