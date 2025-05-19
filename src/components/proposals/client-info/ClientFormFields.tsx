import React, { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ClientSearchAutocomplete } from "./ClientSearchAutocomplete";
import { ClientInformation } from "@/types/proposals";

interface ClientFormFieldsProps {
  clientInfo: ClientInformation;
  updateClientInfo: (e: React.ChangeEvent<HTMLInputElement>) => void;
  setClientInfo?: (clientInfo: ClientInformation) => void;
}

export function ClientFormFields({ 
  clientInfo, 
  updateClientInfo,
  setClientInfo
}: ClientFormFieldsProps) {
  const [clientId, setClientId] = useState<string | null>(null);
  
  const handleClientSelect = (selectedClientInfo: ClientInformation, selectedClientId: string) => {
    setClientId(selectedClientId);
    
    // If we have a direct setter, use it
    if (setClientInfo) {
      setClientInfo({
        ...selectedClientInfo,
        existingClient: true
      });
    } else {
      // Otherwise simulate form field changes (legacy support)
      Object.entries(selectedClientInfo).forEach(([key, value]) => {
        if (key === 'existingClient') return; // Skip the checkbox

        const event = {
          target: {
            name: key,
            value,
            type: 'text'
          }
        } as React.ChangeEvent<HTMLInputElement>;
        
        updateClientInfo(event);
      });
      
      // Set the existingClient checkbox if not already set
      if (!clientInfo.existingClient) {
        const checkboxEvent = {
          target: {
            name: "existingClient",
            type: "checkbox",
            checked: true
          }
        } as React.ChangeEvent<HTMLInputElement>;
        
        updateClientInfo(checkboxEvent);
      }
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start space-x-3 mb-6">
        <Checkbox 
          id="existingClient" 
          name="existingClient"
          checked={clientInfo.existingClient}
          onCheckedChange={(checked) => {
            const e = {
              target: {
                name: "existingClient",
                type: "checkbox",
                checked: !!checked
              }
            } as React.ChangeEvent<HTMLInputElement>;
            updateClientInfo(e);
          }}
        />
        <div className="space-y-1">
          <Label 
            htmlFor="existingClient" 
            className="font-medium text-carbon-gray-900"
          >
            This is an existing client
          </Label>
          <p className="text-sm text-carbon-gray-500">
            Check this box if the client already has an account with CrunchCarbon.
          </p>
        </div>
      </div>
      
      {clientInfo.existingClient && (
        <div className="mb-4 border rounded-md p-4 bg-slate-50">
          <Label className="mb-2 block">Search for existing client</Label>
          <ClientSearchAutocomplete onClientSelect={handleClientSelect} />
          <p className="text-xs text-muted-foreground mt-2">
            Select a client from the dropdown or modify the fields below manually.
          </p>
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="name">Full Name</Label>
          <Input 
            id="name" 
            name="name" 
            value={clientInfo.name}
            onChange={updateClientInfo}
            className="retro-input"
            required
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="email">Email Address</Label>
          <Input 
            id="email" 
            name="email" 
            type="email"
            value={clientInfo.email}
            onChange={updateClientInfo}
            className="retro-input"
            required
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="phone">Phone Number</Label>
          <Input 
            id="phone" 
            name="phone" 
            value={clientInfo.phone}
            onChange={updateClientInfo}
            className="retro-input"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="companyName">Company Name (Optional)</Label>
          <Input 
            id="companyName" 
            name="companyName" 
            value={clientInfo.companyName}
            onChange={updateClientInfo}
            className="retro-input"
          />
        </div>
      </div>
      
      {/* Hidden field for client ID, this will be sent to the backend */}
      {clientId && (
        <input 
          type="hidden" 
          id="clientId" 
          name="clientId" 
          value={clientId} 
        />
      )}
    </div>
  );
}
