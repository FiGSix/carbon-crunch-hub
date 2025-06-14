
import { supabase } from './client'
import { getCurrentUser } from './auth'
import { 
  isCacheValid, 
  setCacheWithExpiry, 
  getCachedProfile, 
  invalidateCache,
  CACHE_TTL_MEDIUM
} from './cache'

/**
 * Get the current user's profile data with improved caching
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
    
    // If no profile exists, create one
    if (!data) {
      console.log("No profile found, creating new profile for user:", user.id);
      const newProfile = {
        id: user.id,
        email: user.email || '',
        role: 'client',
        first_name: '',
        last_name: '',
        created_at: new Date().toISOString()
      };
      
      const { data: createdProfile, error: createError } = await supabase
        .from('profiles')
        .insert(newProfile)
        .select()
        .single()
      
      if (createError) {
        console.error("Error creating profile:", createError);
        return { profile: null, error: createError }
      }
      
      // Cache the new profile
      if (createdProfile && user.id) {
        setCacheWithExpiry(user.id, undefined, createdProfile, CACHE_TTL_MEDIUM);
      }
      
      return { profile: createdProfile, error: null }
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
 * Get a profile by ID with permission check
 * This is useful for fetching other users' profiles when needed
 */
export async function getProfileById(profileId: string) {
  if (!profileId) {
    return { profile: null, error: new Error("No profile ID provided") }
  }

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', profileId)
      .maybeSingle()

    if (error) {
      console.error(`Error fetching profile ${profileId}:`, error);
    }

    return { profile: data, error }
  } catch (fetchError) {
    console.error(`Exception fetching profile ${profileId}:`, fetchError);
    return { 
      profile: null, 
      error: fetchError instanceof Error ? fetchError : new Error("Unknown error fetching profile by ID")
    }
  }
}
