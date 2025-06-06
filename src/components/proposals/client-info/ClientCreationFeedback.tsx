
import React from 'react';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, AlertCircle, Loader2, UserPlus } from 'lucide-react';

interface ClientCreationFeedbackProps {
  isCreating: boolean;
  isNewClient: boolean;
  clientName?: string;
  error?: string;
}

export function ClientCreationFeedback({ 
  isCreating, 
  isNewClient, 
  clientName,
  error 
}: ClientCreationFeedbackProps) {
  if (error) {
    return (
      <Alert variant="destructive" className="mt-2">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          {error}
        </AlertDescription>
      </Alert>
    );
  }

  if (isCreating) {
    return (
      <Alert className="mt-2 border-blue-200 bg-blue-50">
        <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
        <AlertDescription className="text-blue-800">
          Creating new client profile...
        </AlertDescription>
      </Alert>
    );
  }

  if (isNewClient && clientName) {
    return (
      <Alert className="mt-2 border-green-200 bg-green-50">
        <UserPlus className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-green-800">
          New client profile will be created for {clientName}
        </AlertDescription>
      </Alert>
    );
  }

  return null;
}
