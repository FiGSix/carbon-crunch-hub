import React, { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Edit2 } from "lucide-react";
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
  const [isExistingClient, setIsExistingClient] = useState(false);
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [nameValue, setNameValue] = useState(clientInfo.name);
  
  // Update name value when clientInfo changes
  useEffect(() => {
    setNameValue(clientInfo.name);
  }, [clientInfo.name]);
  
  const handleClientSelect = (selectedClientInfo: ClientInformation, selectedClientId: string) => {
    setClientId(selectedClientId);
    setIsExistingClient(true);
    setIsEditingDetails(false);
    
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
      
      // Set the existingClient flag
      const checkboxEvent = {
        target: {
          name: "existingClient",
          type: "checkbox",
          checked: true
        }
      } as React.ChangeEvent<HTMLInputElement>;
      
      updateClientInfo(checkboxEvent);
    }
  };

  const handleNameChange = (value: string) => {
    setNameValue(value);
    
    // If user starts typing in name field and we had an existing client, clear the selection
    if (isExistingClient && value !== clientInfo.name) {
      setIsExistingClient(false);
      setClientId(null);
      
      // Clear the existing client flag
      if (setClientInfo) {
        setClientInfo({
          ...clientInfo,
          name: value,
          existingClient: false
        });
      } else {
        const nameEvent = {
          target: { name: "name", value, type: "text" }
        } as React.ChangeEvent<HTMLInputElement>;
        updateClientInfo(nameEvent);
        
        const checkboxEvent = {
          target: { name: "existingClient", type: "checkbox", checked: false }
        } as React.ChangeEvent<HTMLInputElement>;
        updateClientInfo(checkboxEvent);
      }
    } else if (!isExistingClient) {
      // For new clients, just update the name
      if (setClientInfo) {
        setClientInfo({
          ...clientInfo,
          name: value
        });
      } else {
        const event = {
          target: { name: "name", value, type: "text" }
        } as React.ChangeEvent<HTMLInputElement>;
        updateClientInfo(event);
      }
    }
  };

  const handleEditDetails = () => {
    setIsEditingDetails(true);
  };

  const handleRegularInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateClientInfo(e);
  };

  const isFieldReadOnly = isExistingClient && !isEditingDetails;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="name">Client Name</Label>
          <ClientSearchAutocomplete
            onClientSelect={handleClientSelect}
            value={nameValue}
            onChange={handleNameChange}
            placeholder="Enter client name or search existing..."
          />
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="email">Email Address</Label>
            {isExistingClient && !isEditingDetails && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleEditDetails}
                className="h-auto p-1 text-xs text-muted-foreground hover:text-foreground"
              >
                <Edit2 className="h-3 w-3 mr-1" />
                Edit details
              </Button>
            )}
          </div>
          <Input 
            id="email" 
            name="email" 
            type="email"
            value={clientInfo.email}
            onChange={handleRegularInputChange}
            className={`retro-input ${isFieldReadOnly ? 'bg-muted text-muted-foreground' : ''}`}
            readOnly={isFieldReadOnly}
            required
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="phone">Phone Number</Label>
          <Input 
            id="phone" 
            name="phone" 
            value={clientInfo.phone}
            onChange={handleRegularInputChange}
            className={`retro-input ${isFieldReadOnly ? 'bg-muted text-muted-foreground' : ''}`}
            readOnly={isFieldReadOnly}
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="companyName">Company Name (Optional)</Label>
          <Input 
            id="companyName" 
            name="companyName" 
            value={clientInfo.companyName}
            onChange={handleRegularInputChange}
            className={`retro-input ${isFieldReadOnly ? 'bg-muted text-muted-foreground' : ''}`}
            readOnly={isFieldReadOnly}
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
