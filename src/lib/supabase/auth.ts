
import { supabase } from './client'
import { UserRole } from './types'
import { clearCache, isCacheValid, setCacheWithExpiry, cache } from './cache'

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
