
import { supabase } from '../client'
import { clearCache } from '../cache'

/**
 * Enhanced session refresh with improved error handling and timeout protection
 */
export async function refreshSession(retries = 2): Promise<{ session: any; error: Error | null }> {
  try {
    if (import.meta.env.DEV) {
      console.log("🔄 Attempting to refresh session...");
    }
    
    // Create a timeout promise to prevent hanging
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Session refresh timeout after 10 seconds')), 10000);
    });
    
    // First, check if we already have a valid session
    const sessionCheckPromise = supabase.auth.getSession();
    
    try {
      const { data: currentSession } = await Promise.race([
        sessionCheckPromise,
        timeoutPromise
      ]);
      
      if (currentSession?.session?.expires_at) {
        // Check if the session is still valid with a 5-minute buffer
        const expiresAt = new Date(currentSession.session.expires_at * 1000).getTime();
        const now = new Date().getTime();
        const fiveMinutesInMs = 5 * 60 * 1000;
        
        if (expiresAt > (now + fiveMinutesInMs)) {
          if (import.meta.env.DEV) {
            console.log("✅ Current session is still valid, no refresh needed");
          }
          return { session: currentSession.session, error: null };
        }
      }
    } catch (timeoutError) {
      if (import.meta.env.DEV) {
        console.warn("⚠️ Session check timed out, proceeding with refresh");
      }
    }
    
    // Proceed with refresh if session is expiring soon or invalid
    const refreshPromise = supabase.auth.refreshSession();
    
    try {
      const { data, error } = await Promise.race([
        refreshPromise,
        timeoutPromise
      ]);
      
      if (error) {
        if (import.meta.env.DEV) {
          console.error("❌ Error refreshing session:", error);
        }
        
        // Retry if attempts remain and error is potentially recoverable
        if (retries > 0 && shouldRetryRefresh(error)) {
          if (import.meta.env.DEV) {
            console.log(`🔄 Retrying session refresh. Attempts remaining: ${retries}`);
          }
          await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retry
          return refreshSession(retries - 1);
        }
        
        return { session: null, error };
      }
      
      if (data.session) {
        if (import.meta.env.DEV) {
          console.log("✅ Session refreshed successfully for user:", data.session.user.id);
        }
        
        // Clear any existing cache for this user
        if (data.session.user.id) {
          clearCache();
        }
        
        return { session: data.session, error: null };
      } else {
        if (import.meta.env.DEV) {
          console.log("⚠️ No session returned from refresh");
        }
        return { session: null, error: new Error("No session returned from refresh") };
      }
    } catch (timeoutError) {
      if (import.meta.env.DEV) {
        console.error("⏰ Session refresh timed out");
      }
      return { session: null, error: new Error("Session refresh timed out") };
    }
  } catch (e) {
    if (import.meta.env.DEV) {
      console.error("💥 Exception refreshing session:", e);
    }
    return { session: null, error: e instanceof Error ? e : new Error("Unknown error refreshing session") };
  }
}

/**
 * Determine if a refresh error is worth retrying
 */
function shouldRetryRefresh(error: any): boolean {
  const retryableErrors = [
    'network',
    'timeout',
    'connection',
    'ECONNRESET',
    'ENOTFOUND',
    'ECONNREFUSED'
  ];
  
  const errorMessage = error.message?.toLowerCase() || '';
  return retryableErrors.some(keyword => errorMessage.includes(keyword));
}
