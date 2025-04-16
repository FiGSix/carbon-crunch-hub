
import { supabase } from './client'
import { UserRole } from './types'
import { clearCache, isCacheValid, setCacheWithExpiry, cache, invalidateCache } from './cache'

/**
 * Sign up a new user with email and password
 */
export async function signUp(email: string, password: string, role: UserRole, metadata: Record<string, any> = {}) {
  console.log(`Signing up new user with email: ${email}, role: ${role}`);
  
  // Clear cache on sign up
  clearCache();
  
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          role,
          ...metadata,
        },
      },
    });
    
    return { data, error };
  } catch (e) {
    console.error("Exception during signup:", e);
    return { data: null, error: e instanceof Error ? e : new Error("Unknown error during signup") };
  }
}

/**
 * Sign in a user with email and password
 */
export async function signIn(email: string, password: string) {
  console.log(`Signing in user with email: ${email}`);
  
  // Clear cache on sign in
  clearCache();
  
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    return { data, error };
  } catch (e) {
    console.error("Exception during signin:", e);
    return { data: null, error: e instanceof Error ? e : new Error("Unknown error during signin") };
  }
}

/**
 * Sign out the current user
 */
export async function signOut() {
  console.log("Signing out...");
  
  // Clear cache on sign out
  clearCache();
  
  // Clear all Supabase-related items from localStorage
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (key.includes('supabase') || key.includes('sb-'))) {
      console.log(`Removing localStorage item: ${key}`);
      localStorage.removeItem(key);
    }
  }
  
  // Clear session storage as well
  console.log("Clearing session storage");
  sessionStorage.clear();
  
  try {
    // Finally, call the official sign out method
    const { error } = await supabase.auth.signOut();
    return { error };
  } catch (e) {
    console.error("Exception during signOut:", e);
    return { error: e instanceof Error ? e : new Error("Unknown error during signOut") };
  }
}

/**
 * Get the current authenticated user
 */
export async function getCurrentUser() {
  try {
    const { data, error } = await supabase.auth.getUser();
    
    if (error) {
      console.error("Error getting current user:", error);
    } else if (data.user) {
      console.log("Current user fetched successfully:", data.user.id);
    } else {
      console.log("No current user found");
    }
    
    return { user: data.user, error };
  } catch (e) {
    console.error("Exception getting current user:", e);
    return { user: null, error: e instanceof Error ? e : new Error("Unknown error getting user") };
  }
}

/**
 * Refresh the current session
 */
export async function refreshSession() {
  try {
    console.log("Attempting to refresh session...");
    const { data, error } = await supabase.auth.refreshSession();
    
    if (error) {
      console.error("Error refreshing session:", error);
      return { session: null, error };
    }
    
    if (data.session) {
      console.log("Session refreshed successfully for user:", data.session.user.id);
      
      // Clear any existing role cache for this user
      if (data.session.user.id) {
        invalidateCache(data.session.user.id);
      }
      
      return { session: data.session, error: null };
    } else {
      console.log("No session returned from refresh");
      return { session: null, error: new Error("No session returned from refresh") };
    }
  } catch (e) {
    console.error("Exception refreshing session:", e);
    return { session: null, error: e instanceof Error ? e : new Error("Unknown error refreshing session") };
  }
}

/**
 * Get the role of the current user
 * First tries to get role from JWT claims, falls back to profiles table
 */
export async function getUserRole() {
  try {
    const { user, error } = await getCurrentUser();
    if (error || !user) {
      console.log("Error getting user or user is null:", error);
      return { role: null, error: error || new Error("No authenticated user found") };
    }
    
    // Check cache first with expiry check
    if (user.id && cache.userRole.has(user.id) && isCacheValid(user.id)) {
      console.log("Using cached role for user:", user.id);
      return { role: cache.userRole.get(user.id), error: null };
    }
    
    // First check app_metadata which should contain role from JWT
    let role = user.app_metadata?.role as UserRole;
    if (role) {
      console.log("Found role in app_metadata:", role);
      // Cache the role with expiry if we have a user id
      if (user.id) {
        setCacheWithExpiry(user.id, role);
      }
      return { role, error: null };
    }
    
    // If not found in app_metadata, try to fetch from the profiles table
    console.log("Role not found in app_metadata, checking profiles table");
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    
    if (profileError) {
      console.log("Error fetching profile:", profileError);
      return { role: null, error: profileError };
    }
    
    if (profile && profile.role) {
      role = profile.role as UserRole;
      console.log("Found role in profiles table:", role);
      
      // Cache the role with expiry
      if (user.id) {
        setCacheWithExpiry(user.id, role);
      }
      
      return { role, error: null };
    } else {
      console.log("Role not found in profiles table for user:", user.id);
      return { role: null, error: new Error("Role not found") };
    }
  } catch (e) {
    console.error("Exception getting user role:", e);
    return { role: null, error: e instanceof Error ? e : new Error("Unknown error getting role") };
  }
}
