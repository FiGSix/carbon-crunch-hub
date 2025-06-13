
import { supabase } from '@/integrations/supabase/client';
import { UserProfile, UserRole } from '@/contexts/auth/types';
import { cacheService } from '../cache/CacheService';

// Helper function to safely cast role
function castUserRole(role: string | null | undefined): UserRole | undefined {
  if (!role) return undefined;
  if (['client', 'agent', 'admin'].includes(role)) {
    return role as UserRole;
  }
  return undefined;
}

export class ProfileService {
  static async getProfile(userId: string, forceRefresh = false): Promise<UserProfile | null> {
    const cacheKey = `profile_${userId}`;
    
    if (!forceRefresh) {
      const cached = cacheService.get<UserProfile>(cacheKey);
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
        // Transform raw data to UserProfile with proper type casting
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

        cacheService.set(cacheKey, profile, 10 * 60 * 1000); // 10 minutes for profiles
        return profile;
      }

      return null;
    } catch (error) {
      console.error('Error fetching profile:', error);
      return null;
    }
  }

  static async updateProfile(userId: string, updates: Partial<UserProfile>): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId);

      if (error) throw error;

      // Invalidate profile cache
      cacheService.invalidate(`profile_${userId}`);
      
      return { success: true };
    } catch (error: any) {
      console.error('Error updating profile:', error);
      return { success: false, error: error.message };
    }
  }
}
