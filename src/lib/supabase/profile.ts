
import { supabase } from './client'
import { getCurrentUser } from './auth'
import { isCacheValid, setCacheWithExpiry, cache } from './cache'

/**
 * Get the current user's profile data
 */
export async function getProfile() {
  const { user, error: userError } = await getCurrentUser()
  if (userError || !user) {
    return { profile: null, error: userError }
  }

  // Check cache first with expiry check
  if (cache.profiles.has(user.id) && isCacheValid(user.id)) {
    console.log("Using cached profile for user:", user.id);
    return { profile: cache.profiles.get(user.id), error: null };
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()
    
  // Cache the profile with expiry
  if (data && !error) {
    setCacheWithExpiry(user.id, undefined, data);
  }

  return { profile: data, error }
}

/**
 * Update the current user's profile data
 */
export async function updateProfile(updates: Partial<{
  first_name: string;
  last_name: string;
  company_name: string;
  email: string;
  terms_accepted_at: string | null;
}>) {
  const { user, error: userError } = await getCurrentUser()
  if (userError || !user) {
    return { error: userError }
  }

  // Clear profile cache for this user
  cache.profiles.delete(user.id);
  cache.sessionExpiry.delete(user.id);

  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', user.id)
    .select()
    .single()

  // Update cache with new profile data
  if (data && !error) {
    setCacheWithExpiry(user.id, undefined, data);
  }

  return { data, error }
}
