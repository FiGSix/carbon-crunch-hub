import { toast as sonnerToast } from "sonner";
import { ReactNode, useCallback, useMemo } from "react";

export type ToastProps = {
  title?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  variant?: "default" | "destructive";
};

const adaptToSonnerToast = ({ title, description, variant }: ToastProps) => {
  if (variant === "destructive") {
    return sonnerToast.error(typeof title === "string" ? title : "", { description });
  }
  return sonnerToast(typeof title === "string" ? title : "", { description });
};

const useToast = () => {
  const toast = useCallback((props: ToastProps | string) => {
    if (typeof props === "string") {
      return sonnerToast(props);
    }
    return adaptToSonnerToast(props);
  }, []);

  return useMemo(() => ({ toast }), [toast]);
};

export { useToast, sonnerToast as toast };
