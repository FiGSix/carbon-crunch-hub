
import { supabase } from '@/integrations/supabase/client';
import { UserProfile, UserRole } from '@/contexts/auth/types';
import { ProfileOperations, ProfileUpdateResult, ProfileServiceDependencies } from './types';
import { cacheStore } from '@/lib/supabase/cache';

// Helper function to safely cast role
function castUserRole(role: string | null | undefined): UserRole | undefined {
  if (!role) return undefined;
  if (['client', 'agent', 'admin'].includes(role)) {
    return role as UserRole;
  }
  return undefined;
}

export class ProfileService implements ProfileOperations {
  private static readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor(private dependencies: ProfileServiceDependencies) {}

  private getCacheKey(userId: string): string {
    return `${userId}_profile`;
  }

  async getProfile(userId: string, forceRefresh = false): Promise<UserProfile | null> {
    const cacheKey = this.getCacheKey(userId);
    
    if (!forceRefresh) {
      const entry = cacheStore.get(cacheKey);
      if (entry && Date.now() - entry.timestamp < ProfileService.CACHE_TTL) {
        return entry.data as UserProfile;
      }
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

        cacheStore.set(cacheKey, {
          data: profile,
          timestamp: Date.now(),
          ttl: ProfileService.CACHE_TTL
        });
        
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
      const cacheKey = this.getCacheKey(userId);
      cacheStore.delete(cacheKey);
      
      return { success: true };
    } catch (error: any) {
      console.error('Error updating profile:', error);
      return { success: false, error: error.message };
    }
  }
}
