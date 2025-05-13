
import { toast as sonnerToast, type ToastT } from "sonner";
import { ReactNode } from "react";

// Types for shadcn/ui toast compatibility
export type ToastProps = {
  title?: string;
  description?: ReactNode;
  action?: ReactNode;
  variant?: "default" | "destructive";
};

// Adapter function to convert shadcn/ui toast props to sonner toast
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

// Create a toast compatibility class that mimics shadcn/ui toast API
const createCompatToast = () => {
  return {
    // Direct sonner methods
    toast: sonnerToast,
    
    // Compatibility method for shadcn/ui toast
    // This is what's being called with the {title, description} objects
    // causing the TypeScript errors
    (...args: Parameters<typeof sonnerToast>): ReturnType<typeof sonnerToast> {
      return sonnerToast(...args);
    },
  };
};

// For backward compatibility
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

// Expose both the hook and direct toast function
export { useToast, sonnerToast as toast };
