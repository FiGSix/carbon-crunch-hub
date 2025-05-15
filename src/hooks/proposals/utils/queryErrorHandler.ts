
import { PostgrestError } from "@supabase/supabase-js";
import { logger } from "@/lib/logger";

/**
 * Handles query errors from Supabase, with special handling for permission errors
 */
export async function handleQueryError(
  error: PostgrestError,
  handleAuthError: () => Promise<boolean>
): Promise<never> {
  const errorLogger = logger.withContext({
    component: 'QueryErrorHandler',
    feature: 'proposals'
  });
  
  errorLogger.error("Supabase query error", { error });
  
  // Handle permission errors by refreshing session
  if (error.code === 'PGRST116' || error.code === '42501') {
    errorLogger.info("Permission error detected, trying to refresh session");
    const isAuthenticated = await handleAuthError();
    if (!isAuthenticated) {
      throw new Error("Permission error. Please try logging in again.");
    } else {
      throw new Error("Permission error. Please try again after refreshing.");
    }
  } else {
    throw error;
  }
}
