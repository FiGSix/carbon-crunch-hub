
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";
import { refreshSession } from "@/lib/supabase/auth";

/**
 * Refreshes the Supabase auth session to ensure we have valid tokens
 * Returns whether the refresh succeeded
 */
export async function ensureValidSession(): Promise<boolean> {
  const contextLogger = logger.withContext({ 
    function: 'ensureValidSession'
  });
  
  try {
    // Try to refresh the session to ensure we have a valid token
    const { error: refreshError } = await refreshSession();
    
    if (refreshError) {
      contextLogger.warn("Session refresh failed", { 
        refreshError: refreshError.message 
      });
      return false;
    }
    
    return true;
  } catch (error) {
    contextLogger.error("Unexpected error in session refresh", { error });
    return false;
  }
}
