
import { getCurrentUser } from './getCurrentUser'
import { UserRole } from '../types'
import { supabase } from '../client'
import { 
  getCachedUserRole, 
  isCacheValid, 
  setCacheWithExpiry,
  CACHE_TTL_MEDIUM
} from '../cache'

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
    if (user.id && isCacheValid(user.id, 'role')) {
      console.log("Using cached role for user:", user.id);
      return { role: getCachedUserRole(user.id), error: null };
    }
    
    // First check app_metadata which should contain role from JWT
    let role = user.app_metadata?.role as UserRole;
    if (role) {
      console.log("Found role in app_metadata:", role);
      // Cache the role with expiry if we have a user id
      // Roles from JWT are more stable, so use a longer TTL
      if (user.id) {
        setCacheWithExpiry(user.id, role, undefined, CACHE_TTL_MEDIUM);
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
