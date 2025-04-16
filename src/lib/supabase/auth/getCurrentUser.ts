
import { supabase } from '../client'

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
