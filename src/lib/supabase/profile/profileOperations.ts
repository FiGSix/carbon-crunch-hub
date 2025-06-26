
import { supabase } from '../client';
import { getCurrentUser } from '../auth';
import { 
  isCacheValid, 
  setCacheWithExpiry, 
  getCachedProfile, 
  invalidateCache,
  CACHE_TTL_MEDIUM
} from '../cache';
import { createProfileWithCorrectRole } from './profileCreationService';
import { synchronizeUserRole, getUserRoleFromMetadata } from './roleSyncService';
import { authLogger } from '@/lib/logger';

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
