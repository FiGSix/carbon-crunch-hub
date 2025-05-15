
import { useToast } from "@/hooks/use-toast";
import { ErrorSeverity } from "@/hooks/useErrorHandler";

/**
 * Show toast notification for errors
 */
export function showErrorToast(
  toast: ReturnType<typeof useToast>["toast"],
  message: string,
  severity: ErrorSeverity = "error"
): void {
  toast({
    title: severity === "fatal" ? "Critical Error" : 
           severity === "error" ? "Error" : 
           severity === "warning" ? "Warning" : "Notice",
    description: message,
    variant: severity === "info" ? "default" : "destructive"
  });
}
