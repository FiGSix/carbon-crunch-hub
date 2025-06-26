
import { logger } from "@/lib/logger";
import { AuthEventService } from '@/services/auth/AuthEventService';

export function handleFetchError(error: unknown, toast: any) {
  const errorLogger = logger.withContext({ 
    component: 'ErrorHandler', 
    feature: 'proposals' 
  });
  
  errorLogger.error("Error in proposal fetch", { error });
  
  // Check if this is an auth-related error and dispatch auth-required event
  const isAuthError = AuthEventService.handlePotentialAuthError(error, {
    operation: 'fetch_proposals'
  });

  if (isAuthError) {
    // Auth-required event has been dispatched, the global listener will handle it
    return;
  }
  
  // Show generic error for non-auth errors
  toast({
    title: "Error",
    description: "Failed to load proposals. Please try again.",
    variant: "destructive",
  });
}

export function showToastError(error: any, toast: any, refreshUser: () => void) {
  // Check if this is an auth-related error
  const isAuthError = AuthEventService.handlePotentialAuthError(error);

  if (isAuthError) {
    // Auth-required event has been dispatched, the global listener will handle it
    return;
  }

  // Show generic error for non-auth errors
  toast({
    title: "Error",
    description: error.message || "An unexpected error occurred",
    variant: "destructive",
  });
}
