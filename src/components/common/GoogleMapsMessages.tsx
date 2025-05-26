
import React from "react";

interface GoogleMapsMessagesProps {
  error: string | null;
  isLoading: boolean;
}

export function GoogleMapsMessages({ error, isLoading }: GoogleMapsMessagesProps) {
  return (
    <>
      {error && (
        <p className="text-xs text-destructive mt-1">
          {error}
        </p>
      )}
      
      {isLoading && (
        <p className="text-xs text-muted-foreground mt-1">
          Loading South African address suggestions...
        </p>
      )}
    </>
  );
}
