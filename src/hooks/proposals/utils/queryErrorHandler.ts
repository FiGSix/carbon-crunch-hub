
import { PostgrestError } from "@supabase/supabase-js";
import { logger } from "@/lib/logger";

/**
 * Handles query errors from Supabase, with special handling for permission errors
 */
export function handleQueryError(
  error: PostgrestError,
  toast: any,
  refreshUser: () => void
): string {
  const errorLogger = logger.withContext({
    component: 'QueryErrorHandler',
    feature: 'proposals'
  });
  
  errorLogger.error("Supabase query error", { error });
  
  // Handle permission errors by refreshing session
  if (error.code === 'PGRST116' || error.code === '42501') {
    errorLogger.info("Permission error detected, trying to refresh session");
    refreshUser();
    toast({
      title: "Session expired",
      description: "Please try again after refreshing.",
      variant: "destructive",
    });
    return "Permission error. Please try logging in again.";
  } else {
    toast({
      title: "Error",
      description: error.message || "An unexpected error occurred",
      variant: "destructive",
    });
    return error.message || "An unexpected error occurred";
  }
}
