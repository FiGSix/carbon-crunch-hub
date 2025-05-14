
import { toast as sonnerToast } from "sonner";
import { ReactNode } from "react";

// Types for shadcn/ui toast compatibility
export type ToastProps = {
  title?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  variant?: "default" | "destructive";
};

// Simple adapter function to convert shadcn/ui toast props to sonner toast
const adaptToSonnerToast = ({
  title,
  description,
  action,
  variant,
}: ToastProps) => {
  // Map variants
  const style = variant === "destructive" ? { style: { backgroundColor: "red" } } : {};

  // For ReactNode titles, we need to use a different approach
  // since we can't use JSX in a .ts file
  if (typeof title === "string") {
    return sonnerToast(title, {
      description,
      action,
      ...style,
    });
  }
  
  // For non-string titles, pass them directly to Sonner
  // Sonner internally can handle React nodes
  return sonnerToast(title || "", {
    description,
    action,
    ...style
  });
};

/**
 * Hook that provides a toast function with compatibility for both Sonner's native API
 * and shadcn/ui toast style object parameters.
 */
const useToast = () => {
  return {
    toast: (props: ToastProps | string) => {
      if (typeof props === "string") {
        return sonnerToast(props);
      } else {
        return adaptToSonnerToast(props);
      }
    },
    // Add the toasts array to maintain compatibility with shadcn/ui toast
    toasts: [] // Empty array as Sonner manages its own state
  };
};

// Export the hook and direct toast function for convenience
export { useToast, sonnerToast as toast };
