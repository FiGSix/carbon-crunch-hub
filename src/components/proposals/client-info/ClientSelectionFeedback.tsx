
import React from "react";
import { CheckCircle2, User, Building2, Mail } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ClientSelectionFeedbackProps {
  selectedClient: {
    id: string;
    name: string;
    email: string;
    company: string | null;
    isRegistered: boolean;
  } | null;
  isVisible: boolean;
}

export function ClientSelectionFeedback({ selectedClient, isVisible }: ClientSelectionFeedbackProps) {
  if (!selectedClient || !isVisible) {
    return null;
  }

  return (
    <Alert className="border-green-200 bg-green-50 mt-2">
      <CheckCircle2 className="h-4 w-4 text-green-600" />
      <AlertDescription className="text-green-800">
        <div className="flex items-start space-x-2">
          <div className="flex-1">
            <p className="font-medium">Existing client selected:</p>
            <div className="mt-1 space-y-1 text-sm">
              <div className="flex items-center">
                <User className="h-3 w-3 mr-1" />
                <span>{selectedClient.name}</span>
                {selectedClient.isRegistered && (
                  <span className="ml-2 px-1.5 py-0.5 bg-green-100 text-green-700 text-xs rounded">
                    Registered
                  </span>
                )}
              </div>
              <div className="flex items-center">
                <Mail className="h-3 w-3 mr-1" />
                <span>{selectedClient.email}</span>
              </div>
              {selectedClient.company && (
                <div className="flex items-center">
                  <Building2 className="h-3 w-3 mr-1" />
                  <span>{selectedClient.company}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </AlertDescription>
    </Alert>
  );
}
