
import { supabase } from './client'
import { UserRole } from './types'
import { clearCache, isCacheValid, setCacheWithExpiry, cache } from './cache'

/**
 * Sign up a new user with email and password
 */
export async function signUp(email: string, password: string, role: UserRole, metadata: Record<string, any> = {}) {
  // Clear cache on sign up
  clearCache();
  
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        role,
        ...metadata,
      },
    },
  })
  
  return { data, error }
}

/**
 * Sign in a user with email and password
 */
export async function signIn(email: string, password: string) {
  // Clear cache on sign in
  clearCache();
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  
  return { data, error }
}

/**
 * Sign out the current user
 */
export async function signOut() {
  // Clear cache on sign out
  clearCache();
  
  // Clear all Supabase-related items from localStorage
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (key.includes('supabase') || key.includes('sb-'))) {
      localStorage.removeItem(key);
    }
  }
  
  // Clear session storage as well
  sessionStorage.clear();
  
  // Finally, call the official sign out method
  const { error } = await supabase.auth.signOut()
  return { error }
}

/**
 * Get the current authenticated user
 */
export async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser()
  return { user: data.user, error }
}

/**
 * Get the role of the current user
 * First tries to get role from JWT claims, falls back to profiles table
 */
export async function getUserRole() {
  const { user, error } = await getCurrentUser()
  if (error || !user) {
    console.log("Error getting user or user is null:", error)
    return { role: null, error }
  }
  
  // Check cache first with expiry check
  if (cache.userRole.has(user.id) && isCacheValid(user.id)) {
    console.log("Using cached role for user:", user.id);
    return { role: cache.userRole.get(user.id), error: null };
  }
  
  // First check app_metadata which should contain role from JWT
  let role = user.app_metadata?.role as UserRole
  if (role) {
    console.log("Found role in app_metadata:", role);
    // Cache the role with expiry
    setCacheWithExpiry(user.id, role);
    return { role, error: null };
  }
  
  // If not found in app_metadata, try to fetch from the profiles table
  console.log("Role not found in app_metadata, checking profiles table")
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  
  if (profileError) {
    console.log("Error fetching profile:", profileError)
    return { role: null, error: profileError }
  }
  
  if (profile && profile.role) {
    role = profile.role as UserRole
    console.log("Found role in profiles table:", role)
    
    // Cache the role with expiry
    setCacheWithExpiry(user.id, role);
  }
  
  return { role, error: null }
}
