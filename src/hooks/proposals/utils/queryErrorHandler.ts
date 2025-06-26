
import { PostgrestError } from "@supabase/supabase-js";
import { apiLogger } from "@/lib/logger";

/**
 * Handles query errors from Supabase, with special handling for permission errors
 */
export function handleQueryError(
  error: PostgrestError,
  toast: any,
  refreshUser: () => void
): string {
  apiLogger.error("Supabase query error", { error });
  
  // Handle permission errors by refreshing session
  if (error.code === 'PGRST116' || error.code === '42501') {
    apiLogger.info("Permission error detected, refreshing session");
    refreshUser();
    toast({
      title: "Session expired",
      description: "Please try again after refreshing.",
      variant: "destructive",
    });
    return "Permission error. Please try logging in again.";
  } else if (error.code === '42P17') {
    // Handle infinite recursion in database policies
    apiLogger.error("Database policy recursion detected", { error });
    toast({
      title: "Database Error",
      description: "A database configuration issue was detected. Please contact support.",
      variant: "destructive",
    });
    return "Database configuration error. Please contact support.";
  } else {
    toast({
      title: "Error",
      description: error.message || "An unexpected error occurred",
      variant: "destructive",
    });
    return error.message || "An unexpected error occurred";
  }
}
