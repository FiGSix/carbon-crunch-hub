
import { useToast } from "@/hooks/use-toast";

export interface FetchErrorHandlerOptions {
  showToast?: boolean;
  toastTitle?: string;
  isInitialFetch?: boolean;
  isRefresh?: boolean;
  context?: string;
}

export function createFetchErrorHandler(toast: ReturnType<typeof useToast>["toast"]) {
  return function handleFetchError(
    error: unknown,
    options: FetchErrorHandlerOptions = {}
  ): string {
    const {
      showToast = true,
      toastTitle,
      isInitialFetch = false,
      isRefresh = false,
      context = 'data'
    } = options;

    const errorMessage = error instanceof Error ? error.message : `Failed to fetch ${context}`;
    
    if (showToast) {
      // Show toast for initial fetch errors and refresh errors
      if (isInitialFetch || isRefresh) {
        const title = toastTitle || 
          (isRefresh ? `Refresh Failed` : `Failed to Load ${context.charAt(0).toUpperCase() + context.slice(1)}`);
        
        toast({
          title,
          description: errorMessage,
          variant: "destructive",
        });
      }
    }

    return errorMessage;
  };
}
