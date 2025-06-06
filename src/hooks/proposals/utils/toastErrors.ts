import { logger } from "@/lib/logger";

export function handleFetchError(error: unknown, toast: any) {
  const errorLogger = logger.withContext({ 
    component: 'ErrorHandler', 
    feature: 'proposals' 
  });
  
  errorLogger.error("Error in proposal fetch", { error });
  
  // Show auth-specific errors with recovery options
  if (error instanceof Error && 
     (error.message.includes("JWT") || 
      error.message.includes("token") || 
      error.message.includes("auth") || 
      error.message.includes("permission"))) {
    toast({
      title: "Authentication Error",
      description: "Your session may have expired. Try refreshing the page or logging out and back in.",
      variant: "destructive",
    });
  } else {
    toast({
      title: "Error",
      description: "Failed to load proposals. Please try again.",
      variant: "destructive",
    });
  }
}

export function showToastError(error: any, toast: any, refreshUser: () => void) {
  toast({
    title: "Error",
    description: error.message || "An unexpected error occurred",
    variant: "destructive",
  });
  
  if (error.isAuthError) {
    refreshUser();
  }
}
