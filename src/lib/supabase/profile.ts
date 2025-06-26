import { supabase } from './client'
import { getCurrentUser } from './auth'
import { 
  isCacheValid, 
  setCacheWithExpiry, 
  getCachedProfile, 
  invalidateCache,
  CACHE_TTL_MEDIUM
} from './cache'
import { SecureProfileService } from '../../services/profile/SecureProfileService'
import { UserRole } from '@/contexts/auth/types'
import { authLogger } from '@/lib/logger'

/**
 * Enhanced role detection from user metadata
 */
async function getUserRoleFromMetadata(userId: string): Promise<UserRole> {
  try {
    // Get user metadata from auth.users
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user || user.id !== userId) {
      authLogger.warn("Could not get user metadata for role detection", { userId, error: error?.message });
      return 'client'; // Safe default
    }
    
    // Check user metadata for role
    const metadataRole = user.user_metadata?.role || user.app_metadata?.role;
    
    if (metadataRole && ['client', 'agent', 'admin'].includes(metadataRole)) {
      authLogger.info("Role detected from metadata", { userId, metadataRole });
      return metadataRole as UserRole;
    }
    
    authLogger.warn("No valid role in metadata, defaulting to client", { userId });
    return 'client';
  } catch (error) {
    authLogger.error("Exception getting user role from metadata", { userId, error });
    return 'client';
  }
}

/**
 * Role synchronization function to ensure profile role matches auth metadata
 */
export async function synchronizeUserRole(userId: string): Promise<{ success: boolean; role?: UserRole; error?: string }> {
  try {
    authLogger.info("Starting role synchronization", { userId });
    
    // Get role from auth metadata
    const metadataRole = await getUserRoleFromMetadata(userId);
    
    // Get current profile
    const { data: currentProfile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .maybeSingle();
    
    if (profileError) {
      authLogger.error("Error fetching profile for role sync", { userId, error: profileError });
      return { success: false, error: profileError.message };
    }
    
    // If profile doesn't exist or role mismatch, update it
    if (!currentProfile || currentProfile.role !== metadataRole) {
      authLogger.info("Role sync needed", { 
        userId, 
        currentRole: currentProfile?.role, 
        targetRole: metadataRole 
      });
      
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ role: metadataRole })
        .eq('id', userId);
      
      if (updateError) {
        authLogger.error("Error updating profile role", { userId, error: updateError });
        return { success: false, error: updateError.message };
      }
      
      // Invalidate cache after role update
      invalidateCache(userId, 'profile');
      
      authLogger.info("Role synchronized successfully", { userId, role: metadataRole });
      return { success: true, role: metadataRole };
    }
    
    authLogger.info("Role already synchronized", { userId, role: metadataRole });
    return { success: true, role: metadataRole };
    
  } catch (error) {
    authLogger.error("Exception during role synchronization", { userId, error });
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error during role sync"
    };
  }
}

/**
 * Enhanced profile creation with proper role detection
 */
async function createProfileWithCorrectRole(userId: string, userEmail: string): Promise<any> {
  authLogger.info("Creating new profile", { userId });
  
  // Get the correct role from auth metadata
  const detectedRole = await getUserRoleFromMetadata(userId);
  
  const newProfile = {
    id: userId,
    email: userEmail,
    role: detectedRole, // Use detected role instead of hardcoded 'client'
    first_name: '',
    last_name: '',
    created_at: new Date().toISOString()
  };
  
  authLogger.info("Creating profile with detected role", { userId, detectedRole });
  
  const { data: createdProfile, error: createError } = await supabase
    .from('profiles')
    .insert(newProfile)
    .select()
    .single();
  
  if (createError) {
    authLogger.error("Error creating profile", { userId, error: createError });
    return { profile: null, error: createError };
  }
  
  authLogger.info("Profile created successfully", { userId, role: detectedRole });
  return { profile: createdProfile, error: null };
}

/**
 * Get the current user's profile data with improved caching and role detection
 */
export async function getProfile() {
  const { user, error: userError } = await getCurrentUser()
  if (userError || !user) {
    authLogger.error("Cannot get profile - no authenticated user", { error: userError?.message });
    return { profile: null, error: userError || new Error("No authenticated user") }
  }

  // Check cache first with expiry check
  if (user.id && isCacheValid(user.id, 'profile')) {
    authLogger.debug("Using cached profile", { userId: user.id });
    return { profile: getCachedProfile(user.id), error: null };
  }

  authLogger.info("Fetching profile from database", { userId: user.id });
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle()
      
    if (error) {
      authLogger.error("Error fetching profile", { userId: user.id, error });
      return { profile: null, error }
    }
    
    // If no profile exists, create one with correct role detection
    if (!data) {
      authLogger.info("No profile found, creating new profile", { userId: user.id });
      const createResult = await createProfileWithCorrectRole(user.id, user.email || '');
      
      if (createResult.error) {
        return { profile: null, error: createResult.error };
      }
      
      // Cache the new profile
      if (createResult.profile && user.id) {
        setCacheWithExpiry(user.id, undefined, createResult.profile, CACHE_TTL_MEDIUM);
      }
      
      return { profile: createResult.profile, error: null };
    }
    
    // Validate existing profile role against metadata
    const metadataRole = await getUserRoleFromMetadata(user.id);
    if (data.role !== metadataRole) {
      authLogger.warn("Role mismatch detected", { 
        userId: user.id, 
        profileRole: data.role, 
        metadataRole 
      });
      
      // Attempt to synchronize role
      const syncResult = await synchronizeUserRole(user.id);
      if (syncResult.success && syncResult.role) {
        // Update the data object with corrected role
        data.role = syncResult.role;
        authLogger.info("Role corrected", { userId: user.id, correctedRole: syncResult.role });
      } else {
        authLogger.warn("Role sync failed", { userId: user.id, error: syncResult.error });
      }
    }
      
    // Cache the profile with medium TTL since profiles don't change often
    if (data && user.id) {
      setCacheWithExpiry(user.id, undefined, data, CACHE_TTL_MEDIUM);
    }

    return { profile: data, error: null }
  } catch (fetchError) {
    authLogger.error("Exception fetching profile", { userId: user.id, error: fetchError });
    return { 
      profile: null, 
      error: fetchError instanceof Error ? fetchError : new Error("Unknown error fetching profile")
    }
  }
}

/**
 * Update the current user's profile data
 */
export async function updateProfile(updates: Partial<{
  first_name: string;
  last_name: string;
  company_name: string;
  company_logo_url: string;
  avatar_url: string;
  email: string;
  phone: string;
  terms_accepted_at: string | null;
}>) {
  const { user, error: userError } = await getCurrentUser()
  if (userError || !user) {
    authLogger.error("Cannot update profile - no authenticated user", { error: userError?.message });
    return { error: userError || new Error("No authenticated user") }
  }

  // Invalidate profile cache for this user
  if (user.id) {
    invalidateCache(user.id, 'profile');
  }

  try {
    // First, check if profile exists
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .maybeSingle()
    
    if (!existingProfile) {
      // Create profile if it doesn't exist
      const newProfile = {
        id: user.id,
        email: user.email || '',
        role: 'client',
        ...updates
      };
      
      const { data, error } = await supabase
        .from('profiles')
        .insert(newProfile)
        .select()
        .single()
      
      // Update cache with new profile data
      if (data && !error && user.id) {
        setCacheWithExpiry(user.id, undefined, data, CACHE_TTL_MEDIUM);
      }
      
      return { data, error }
    }
    
    // Update existing profile
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single()

    // Update cache with new profile data
    if (data && !error && user.id) {
      setCacheWithExpiry(user.id, undefined, data, CACHE_TTL_MEDIUM);
    }

    return { data, error }
  } catch (updateError) {
    authLogger.error("Exception updating profile", { userId: user.id, error: updateError });
    return { 
      data: null, 
      error: updateError instanceof Error ? updateError : new Error("Unknown error updating profile")
    }
  }
}

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
