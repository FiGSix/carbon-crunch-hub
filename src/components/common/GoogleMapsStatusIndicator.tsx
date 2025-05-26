
import React from "react";
import { Loader2, AlertTriangle } from "lucide-react";

interface GoogleMapsStatusIndicatorProps {
  isLoading: boolean;
  error: string | null;
}

export function GoogleMapsStatusIndicator({ isLoading, error }: GoogleMapsStatusIndicatorProps) {
  const showLoadingSpinner = isLoading && !error;
  const showErrorIcon = !!error;

  if (!showLoadingSpinner && !showErrorIcon) {
    return null;
  }

  return (
    <div className="absolute right-3 top-1/2 -translate-y-1/2">
      {showLoadingSpinner && (
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      )}
      
      {showErrorIcon && (
        <AlertTriangle className="h-4 w-4 text-destructive" />
      )}
    </div>
  );
}
