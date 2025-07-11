
import { useToast } from "@/hooks/use-toast";
import { ErrorSeverity } from "@/types/errors";

// Standardized toast titles for consistency
const TOAST_TITLES: Record<ErrorSeverity, string> = {
  info: "Info",
  warning: "Warning", 
  error: "Error",
  fatal: "Critical Error"
};

// Toast variant mapping
const TOAST_VARIANTS: Record<ErrorSeverity, "default" | "destructive"> = {
  info: "default",
  warning: "destructive",
  error: "destructive", 
  fatal: "destructive"
};

/**
 * Show standardized toast notification for errors
 */
export function showErrorToast(
  toast: ReturnType<typeof useToast>["toast"],
  message: string,
  severity: ErrorSeverity = "error"
): void {
  toast({
    title: TOAST_TITLES[severity],
    description: message,
    variant: TOAST_VARIANTS[severity]
  });
}

/**
 * Show success toast with consistent styling
 */
export function showSuccessToast(
  toast: ReturnType<typeof useToast>["toast"],
  message: string,
  title: string = "Success"
): void {
  toast({
    title,
    description: message,
    variant: "default"
  });
}

/**
 * Show standardized validation error toast
 */
export function showValidationErrorToast(
  toast: ReturnType<typeof useToast>["toast"],
  fieldName: string,
  errorMessage: string
): void {
  toast({
    title: "Validation Error",
    description: `${fieldName}: ${errorMessage}`,
    variant: "destructive"
  });
}

/**
 * Show network error toast with retry option
 */
export function showNetworkErrorToast(
  toast: ReturnType<typeof useToast>["toast"],
  retryAction?: () => void
): void {
  if (retryAction) {
    toast({
      title: "Connection Error",
      description: "Unable to connect to the server. Please check your internet connection.",
      variant: "destructive"
    });
  } else {
    toast({
      title: "Connection Error", 
      description: "Unable to connect to the server. Please check your internet connection.",
      variant: "destructive"
    });
  }
}
