
import { toast as sonnerToast } from "sonner";
import { ReactNode } from "react";

// Types for shadcn/ui toast compatibility
export type ToastProps = {
  title?: string;
  description?: ReactNode;
  action?: ReactNode;
  variant?: "default" | "destructive";
};

// Simple adapter function to convert shadcn/ui toast props to sonner toast
const adaptToSonnerToast = ({
  title,
  description,
  variant,
  action,
  ...rest
}: ToastProps) => {
  if (variant === "destructive") {
    return sonnerToast.error(title, {
      description,
      action,
      ...rest,
    });
  }

  return sonnerToast(title, {
    description,
    action,
    ...rest,
  });
};

/**
 * Hook that provides a toast function with compatibility for both Sonner's native API
 * and shadcn/ui toast style object parameters.
 */
const useToast = () => {
  return {
    toast: (props: ToastProps | string) => {
      // Handle string case for direct calls
      if (typeof props === "string") {
        return sonnerToast(props);
      }
      
      // Handle object case (shadcn/ui style)
      return adaptToSonnerToast(props);
    }
  };
};

// Export the hook and direct toast function for convenience
export { useToast, sonnerToast as toast };
