
import React from "react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { ClientInformation } from "./types";
import { ClientFormFields } from "./client-info/ClientFormFields";
import { ClientNotification } from "./client-info/ClientNotification";
import { ClientStepFooter } from "./client-info/ClientStepFooter";

interface ClientInfoStepProps {
  clientInfo: ClientInformation;
  updateClientInfo: (e: React.ChangeEvent<HTMLInputElement>) => void;
  nextStep: () => void;
  prevStep: () => void;
  setClientInfo?: (clientInfo: ClientInformation) => void;
  selectedClientId?: string;
  setSelectedClientId?: (id: string | null) => void;
}

export function ClientInfoStep({ 
  clientInfo, 
  updateClientInfo, 
  nextStep, 
  prevStep,
  setClientInfo,
  selectedClientId,
  setSelectedClientId
}: ClientInfoStepProps) {
  const isFormValid = Boolean(clientInfo.name && clientInfo.email);

  // Handle client selection from the autocomplete
  const handleClientSelect = (updatedClientInfo: ClientInformation, clientId: string) => {
    if (setClientInfo) {
      setClientInfo(updatedClientInfo);
    }
    
    if (setSelectedClientId) {
      setSelectedClientId(clientId);
    }
  };

  return (
    <Card className="retro-card">
      <CardHeader>
        <CardTitle>Client Information</CardTitle>
        <CardDescription>
          Provide details about the client who will receive this proposal.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <ClientFormFields 
            clientInfo={clientInfo}
            updateClientInfo={updateClientInfo}
            setClientInfo={setClientInfo}
          />
          
          <ClientNotification isExistingClient={clientInfo.existingClient} />
        </div>
      </CardContent>
      <CardFooter>
        <ClientStepFooter
          nextStep={nextStep}
          prevStep={prevStep}
          isValid={isFormValid}
        />
      </CardFooter>
    </Card>
  );
}
