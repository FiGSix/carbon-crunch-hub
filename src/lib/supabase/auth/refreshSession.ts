
import { supabase } from '../client'
import { clearCache } from '../cache'

/**
 * Simplified session refresh with better error handling
 */
export async function refreshSession(): Promise<{ session: any; error: Error | null }> {
  try {
    if (import.meta.env.DEV) {
      console.log("🔄 Attempting to refresh session...");
    }
    
    const { data, error } = await supabase.auth.refreshSession();
    
    if (error) {
      if (import.meta.env.DEV) {
        console.error("❌ Error refreshing session:", error);
      }
      return { session: null, error };
    }
    
    if (data.session) {
      if (import.meta.env.DEV) {
        console.log("✅ Session refreshed successfully");
      }
      
      // Clear cache for this user
      clearCache();
      
      return { session: data.session, error: null };
    } else {
      if (import.meta.env.DEV) {
        console.log("⚠️ No session returned from refresh");
      }
      return { session: null, error: new Error("No session returned from refresh") };
    }
  } catch (e) {
    if (import.meta.env.DEV) {
      console.error("💥 Exception refreshing session:", e);
    }
    return { session: null, error: e instanceof Error ? e : new Error("Unknown error refreshing session") };
  }
}
