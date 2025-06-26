
import { getCurrentUser } from '../auth';
import { SecureProfileService } from '@/services/profile/SecureProfileService';
import { UserRole } from '@/contexts/auth/types';
import { authLogger } from '@/lib/logger';

/**
 * SECURE: Get a profile by ID with proper authorization
 * This function requires authentication and enforces role-based access control
 */
export async function getProfileById(profileId: string) {
  if (!profileId) {
    return { profile: null, error: new Error("No profile ID provided") }
  }

  try {
    // Get current user for authorization
    const { user, error: authError } = await getCurrentUser()
    if (authError || !user) {
      return { 
        profile: null, 
        error: new Error("Authentication required to access profiles")
      }
    }

    // Get user's role from their profile
    const { getProfile } = await import('./profileOperations')
    const { profile: currentUserProfile } = await getProfile()
    if (!currentUserProfile?.role) {
      return { 
        profile: null, 
        error: new Error("Unable to determine user role")
      }
    }

    // Use secure profile service with proper authorization
    const result = await SecureProfileService.getProfileById(
      profileId,
      user.id,
      currentUserProfile.role as UserRole
    );

    return { 
      profile: result.profile, 
      error: result.error ? new Error(result.error) : null 
    };

  } catch (fetchError) {
    authLogger.error(`Exception fetching profile ${profileId}:`, fetchError);
    return { 
      profile: null, 
      error: fetchError instanceof Error ? fetchError : new Error("Unknown error fetching profile by ID")
    }
  }
}
