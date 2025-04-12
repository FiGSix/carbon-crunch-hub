
import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/supabase'

// Use the environment variables or direct values from the client.ts file if needed
const supabaseUrl = "https://uyjryuopuqgmsvayiccl.supabase.co"
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV5anJ5dW9wdXFnbXN2YXlpY2NsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQyNzU2MzgsImV4cCI6MjA1OTg1MTYzOH0.M828t6sJxh4lZAVACqpRosoRvW_VibHDAMSXV-3WrLo"

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: localStorage
  }
})

// Optimized cache for frequently accessed data
const cache = {
  userRole: new Map<string, UserRole>(),
  profiles: new Map<string, any>(),
  sessionExpiry: new Map<string, number>()
};

// Time to live for cache items (10 minutes)
const CACHE_TTL = 10 * 60 * 1000;

// Types for our user roles
export type UserRole = 'client' | 'agent' | 'admin'

// Auth related functions
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

export async function signIn(email: string, password: string) {
  // Clear cache on sign in
  clearCache();
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  
  return { data, error }
}

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

// Clear all cache data
function clearCache() {
  cache.userRole.clear();
  cache.profiles.clear();
  cache.sessionExpiry.clear();
}

// Check if a cache entry is still valid
function isCacheValid(userId: string) {
  const expiry = cache.sessionExpiry.get(userId);
  return expiry && expiry > Date.now();
}

// Set cache with expiry
function setCacheWithExpiry(userId: string, roleCache?: UserRole, profileCache?: any) {
  const expiry = Date.now() + CACHE_TTL;
  cache.sessionExpiry.set(userId, expiry);
  
  if (roleCache) {
    cache.userRole.set(userId, roleCache);
  }
  
  if (profileCache) {
    cache.profiles.set(userId, profileCache);
  }
}

export async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser()
  return { user: data.user, error }
}

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
  
  // First check user_metadata which is the primary location
  let role = user.user_metadata?.role as UserRole
  
  // If not found in user_metadata, try to fetch from the profiles table
  if (!role) {
    console.log("Role not found in user_metadata, checking profiles table")
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
    }
  } else {
    console.log("Found role in user_metadata:", role)
  }
  
  // Cache the role with expiry
  if (role) {
    setCacheWithExpiry(user.id, role);
  }
  
  return { role, error: null }
}

// Profile related functions
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
