
import { supabase } from './client'
import { getCurrentUser } from './auth'
import { 
  isCacheValid, 
  setCacheWithExpiry, 
  getCachedProfile, 
  invalidateCache 
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
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()
    
  if (error) {
    console.error("Error fetching profile:", error);
    return { profile: null, error }
  }
    
  // Cache the profile with expiry
  if (data && user.id) {
    setCacheWithExpiry(user.id, undefined, data);
  }

  return { profile: data, error: null }
}

/**
 * Update the current user's profile data
 */
export async function updateProfile(updates: Partial<{
  first_name: string;
  last_name: string;
  company_name: string;
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

  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', user.id)
    .select()
    .single()

  // Update cache with new profile data
  if (data && !error && user.id) {
    setCacheWithExpiry(user.id, undefined, data);
  }

  return { data, error }
}

/**
 * Get a profile by ID with permission check
 * This is useful for fetching other users' profiles when needed
 */
export async function getProfileById(profileId: string) {
  if (!profileId) {
    return { profile: null, error: new Error("No profile ID provided") }
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', profileId)
    .maybeSingle()

  if (error) {
    console.error(`Error fetching profile ${profileId}:`, error);
  }

  return { profile: data, error }
}
