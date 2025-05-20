
import React from 'react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface AuthErrorDisplayProps {
  error: string | null;
}

export function AuthErrorDisplay({ error }: AuthErrorDisplayProps) {
  if (!error) return null;
  
  return (
    <Alert variant="destructive" className="mb-4">
      <AlertTitle>Authentication Error</AlertTitle>
      <AlertDescription>{error}</AlertDescription>
    </Alert>
  );
}
