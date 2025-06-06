
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
import { ClientStepFooter } from "./client-info/ClientStepFooter";
import { ClientCreationFeedback } from "./client-info/ClientCreationFeedback";

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
  const isNewClient = !selectedClientId && clientInfo.name && clientInfo.email && !clientInfo.existingClient;

  return (
    <Card className="retro-card">
      <CardHeader>
        <CardTitle>Client Information</CardTitle>
        <CardDescription>
          Search for an existing client or enter new client details. Start typing in the name field to see matching clients.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <ClientFormFields 
            clientInfo={clientInfo}
            updateClientInfo={updateClientInfo}
            setClientInfo={setClientInfo}
          />
          
          <ClientCreationFeedback
            isCreating={false}
            isNewClient={isNewClient}
            clientName={clientInfo.name}
          />
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
