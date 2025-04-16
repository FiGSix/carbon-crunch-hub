
import { supabase } from '../client'
import { invalidateCache } from '../cache'

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
