
import { supabase } from '@/integrations/supabase/client';
import { UserProfile, UserRole } from '@/contexts/auth/types';
import { cacheStore } from '@/lib/supabase/cache';
import { ErrorHandler } from '../utils/ErrorHandler';
import { SecureProfileService } from '../../profile/SecureProfileService';

/**
 * Profile data operations with enhanced security validation
 */
export class ProfileDataService {
  private static readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  static getCacheKey(type: string, userId: string): string {
    return `${userId}_${type}`;
  }

  static async getProfile(userId: string, forceRefresh = false): Promise<UserProfile | null> {
    const cacheKey = this.getCacheKey('profile', userId);
    
    if (!forceRefresh) {
      const entry = cacheStore.get(cacheKey);
      if (entry && Date.now() - entry.timestamp < this.CACHE_TTL) {
        return entry.data as UserProfile;
      }
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        const errorResult = ErrorHandler.handleRLSError(error, 'profile fetch');
        if (errorResult.shouldReturnEmpty) {
          if (errorResult.requiresReauth) {
            // Signal that re-authentication is needed
            window.dispatchEvent(new CustomEvent('auth-required'));
          }
          return null;
        }
        throw error;
      }

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
          role: data.role as UserRole,
          terms_accepted_at: data.terms_accepted_at,
          created_at: data.created_at,
          intro_video_viewed: data.intro_video_viewed,
          intro_video_viewed_at: data.intro_video_viewed_at
        };

        cacheStore.set(cacheKey, {
          data: profile,
          timestamp: Date.now(),
          ttl: this.CACHE_TTL
        });
        
        return profile;
      }

      return null;
    } catch (error) {
      console.error('Error fetching profile:', error);
      ErrorHandler.logSecurityEvent({
        type: 'access_denied',
        userId,
        resource: 'profile',
        action: 'fetch',
        details: error
      });
      return null;
    }
  }

  /**
   * DEPRECATED: Use SecureProfileService.getProfileById instead
   * Get profile by ID with proper authorization checks
   */
  static async getProfileById(
    targetProfileId: string,
    currentUserId: string,
    currentUserRole: UserRole
  ): Promise<{ profile: Partial<UserProfile> | null; error?: string }> {
    console.warn('⚠️  ProfileDataService.getProfileById is deprecated. Use SecureProfileService.getProfileById instead.');
    
    return SecureProfileService.getProfileById(targetProfileId, currentUserId, currentUserRole);
  }

  static async updateProfile(userId: string, updates: Partial<UserProfile>): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId);

      if (error) {
        const errorResult = ErrorHandler.handleRLSError(error, 'profile update');
        if (errorResult.requiresReauth) {
          window.dispatchEvent(new CustomEvent('auth-required'));
        }
        return { success: false, error: errorResult.message };
      }

      // Clear cache for this user
      const profileKey = this.getCacheKey('profile', userId);
      cacheStore.delete(profileKey);
      
      return { success: true };
    } catch (error: any) {
      console.error('Error updating profile:', error);
      ErrorHandler.logSecurityEvent({
        type: 'access_denied',
        userId,
        resource: 'profile',
        action: 'update',
        details: error
      });
      return { success: false, error: error.message };
    }
  }
}
