
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

/**
 * Enhanced role detection from user metadata
 */
async function getUserRoleFromMetadata(userId: string): Promise<UserRole> {
  try {
    // Get user metadata from auth.users
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user || user.id !== userId) {
      console.warn("Could not get user metadata for role detection:", error?.message);
      return 'client'; // Safe default
    }
    
    // Check user metadata for role
    const metadataRole = user.user_metadata?.role || user.app_metadata?.role;
    
    if (metadataRole && ['client', 'agent', 'admin'].includes(metadataRole)) {
      console.log(`✅ Role detected from metadata: ${metadataRole} for user ${userId}`);
      return metadataRole as UserRole;
    }
    
    console.log(`⚠️ No valid role in metadata for user ${userId}, defaulting to 'client'`);
    return 'client';
  } catch (error) {
    console.error("Exception getting user role from metadata:", error);
    return 'client';
  }
}

/**
 * Role synchronization function to ensure profile role matches auth metadata
 */
export async function synchronizeUserRole(userId: string): Promise<{ success: boolean; role?: UserRole; error?: string }> {
  try {
    console.log(`🔄 Starting role synchronization for user: ${userId}`);
    
    // Get role from auth metadata
    const metadataRole = await getUserRoleFromMetadata(userId);
    
    // Get current profile
    const { data: currentProfile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .maybeSingle();
    
    if (profileError) {
      console.error("Error fetching profile for role sync:", profileError);
      return { success: false, error: profileError.message };
    }
    
    // If profile doesn't exist or role mismatch, update it
    if (!currentProfile || currentProfile.role !== metadataRole) {
      console.log(`🔧 Role sync needed: profile role '${currentProfile?.role}' → metadata role '${metadataRole}'`);
      
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ role: metadataRole })
        .eq('id', userId);
      
      if (updateError) {
        console.error("Error updating profile role:", updateError);
        return { success: false, error: updateError.message };
      }
      
      // Invalidate cache after role update
      invalidateCache(userId, 'profile');
      
      console.log(`✅ Role synchronized successfully: ${metadataRole} for user ${userId}`);
      return { success: true, role: metadataRole };
    }
    
    console.log(`✓ Role already synchronized: ${metadataRole} for user ${userId}`);
    return { success: true, role: metadataRole };
    
  } catch (error) {
    console.error("Exception during role synchronization:", error);
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
  console.log(`🆕 Creating new profile for user: ${userId}`);
  
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
  
  console.log(`📝 Creating profile with role: ${detectedRole} for user ${userId}`);
  
  const { data: createdProfile, error: createError } = await supabase
    .from('profiles')
    .insert(newProfile)
    .select()
    .single();
  
  if (createError) {
    console.error("❌ Error creating profile:", createError);
    return { profile: null, error: createError };
  }
  
  console.log(`✅ Profile created successfully with role: ${detectedRole} for user ${userId}`);
  return { profile: createdProfile, error: null };
}

/**
 * Get the current user's profile data with improved caching and role detection
 */
export async function getProfile() {
  const { user, error: userError } = await getCurrentUser()
  if (userError || !user) {
    console.error("Cannot get profile - no authenticated user:", userError?.message);
    return { profile: null, error: userError || new Error("No authenticated user") }
  }

  // Check cache first with expiry check
  if (user.id && isCacheValid(user.id, 'profile')) {
    console.log("Using cached profile for user:", user.id);
    return { profile: getCachedProfile(user.id), error: null };
  }

  console.log("Fetching profile from database for user:", user.id);
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle()
      
    if (error) {
      console.error("Error fetching profile:", error);
      return { profile: null, error }
    }
    
    // If no profile exists, create one with correct role detection
    if (!data) {
      console.log("No profile found, creating new profile for user:", user.id);
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
      console.log(`⚠️ Role mismatch detected: profile has '${data.role}', metadata has '${metadataRole}'`);
      
      // Attempt to synchronize role
      const syncResult = await synchronizeUserRole(user.id);
      if (syncResult.success && syncResult.role) {
        // Update the data object with corrected role
        data.role = syncResult.role;
        console.log(`✅ Role corrected to: ${syncResult.role}`);
      } else {
        console.warn(`⚠️ Role sync failed: ${syncResult.error}`);
      }
    }
      
    // Cache the profile with medium TTL since profiles don't change often
    if (data && user.id) {
      setCacheWithExpiry(user.id, undefined, data, CACHE_TTL_MEDIUM);
    }

    return { profile: data, error: null }
  } catch (fetchError) {
    console.error("Exception fetching profile:", fetchError);
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
    console.error("Cannot update profile - no authenticated user:", userError?.message);
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
    console.error("Exception updating profile:", updateError);
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
    console.error(`Exception fetching profile ${profileId}:`, fetchError);
    return { 
      profile: null, 
      error: fetchError instanceof Error ? fetchError : new Error("Unknown error fetching profile by ID")
    }
  }
}
