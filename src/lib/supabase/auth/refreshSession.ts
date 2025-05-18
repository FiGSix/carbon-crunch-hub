
import { supabase } from '../client'
import { invalidateCache } from '../cache'

/**
 * Refresh the current session with improved error handling and retry logic
 */
export async function refreshSession(retries = 1): Promise<{ session: any; error: Error | null }> {
  try {
    console.log("Attempting to refresh session...");
    
    // First, check if we already have a valid session
    const { data: currentSession } = await supabase.auth.getSession();
    
    if (currentSession?.session?.expires_at) {
      // Check if the session is still valid with a 5-minute buffer
      const expiresAt = new Date(currentSession.session.expires_at).getTime();
      const now = new Date().getTime();
      const fiveMinutesInMs = 5 * 60 * 1000;
      
      if (expiresAt > (now + fiveMinutesInMs)) {
        console.log("Current session is still valid, no refresh needed");
        return { session: currentSession.session, error: null };
      }
    }
    
    // Proceed with refresh if session is expiring soon or invalid
    const { data, error } = await supabase.auth.refreshSession();
    
    if (error) {
      console.error("Error refreshing session:", error);
      
      // Retry if attempts remain and error is potentially recoverable
      if (retries > 0 && (error.message.includes('network') || error.message.includes('timeout'))) {
        console.log(`Retrying session refresh. Attempts remaining: ${retries}`);
        return refreshSession(retries - 1);
      }
      
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
