
import React, { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Edit2 } from "lucide-react";
import { ClientSearchAutocomplete } from "./ClientSearchAutocomplete";
import { ClientSelectionFeedback } from "./ClientSelectionFeedback";
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
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [isExistingClient, setIsExistingClient] = useState(false);
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [nameValue, setNameValue] = useState(clientInfo.name);
  
  console.log('=== ClientFormFields Debug ===');
  console.log('clientInfo:', clientInfo);
  console.log('selectedClient:', selectedClient);
  console.log('isExistingClient:', isExistingClient);
  console.log('clientId:', clientId);
  console.log('nameValue:', nameValue);
  
  // Update name value when clientInfo changes
  useEffect(() => {
    setNameValue(clientInfo.name);
  }, [clientInfo.name]);

  // Sync existing client state with clientInfo
  useEffect(() => {
    setIsExistingClient(clientInfo.existingClient || false);
  }, [clientInfo.existingClient]);
  
  const handleClientSelect = (selectedClientInfo: ClientInformation, selectedClientId: string) => {
    console.log('=== Client Selected ===');
    console.log('selectedClientInfo:', selectedClientInfo);
    console.log('selectedClientId:', selectedClientId);
    
    // Store the full client data for display
    setSelectedClient({
      id: selectedClientId,
      name: selectedClientInfo.name,
      email: selectedClientInfo.email,
      company: selectedClientInfo.companyName,
      isRegistered: true // Assume registered if coming from search
    });
    
    setClientId(selectedClientId);
    setIsExistingClient(true);
    setIsEditingDetails(false);
    
    // Update form state immediately
    if (setClientInfo) {
      const updatedClientInfo = {
        ...selectedClientInfo,
        existingClient: true
      };
      console.log('Updating clientInfo with:', updatedClientInfo);
      setClientInfo(updatedClientInfo);
    } else {
      // Legacy form update approach
      Object.entries(selectedClientInfo).forEach(([key, value]) => {
        if (key === 'existingClient') return;

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

    console.log('=== Client selection completed ===');
  };

  const handleNameChange = (value: string) => {
    console.log('=== Name Change ===');
    console.log('Previous nameValue:', nameValue);
    console.log('New value:', value);
    console.log('Current isExistingClient:', isExistingClient);
    
    setNameValue(value);
    
    // If user starts typing and we had an existing client, clear the selection
    if (isExistingClient && value !== clientInfo.name) {
      console.log('Clearing existing client selection due to manual typing');
      setIsExistingClient(false);
      setSelectedClient(null);
      setClientId(null);
      
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
    console.log('Edit details clicked');
    setIsEditingDetails(true);
  };

  const handleRegularInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('Regular input change:', e.target.name, e.target.value);
    updateClientInfo(e);
  };

  const isFieldReadOnly = isExistingClient && !isEditingDetails;
  const showAutocomplete = !isExistingClient || isEditingDetails;

  console.log('=== Render State ===');
  console.log('isFieldReadOnly:', isFieldReadOnly);
  console.log('showAutocomplete:', showAutocomplete);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="name">Client Name</Label>
          {showAutocomplete ? (
            <ClientSearchAutocomplete
              onClientSelect={handleClientSelect}
              value={nameValue}
              onChange={handleNameChange}
              placeholder="Enter client name or search existing..."
            />
          ) : (
            <Input 
              id="name" 
              name="name" 
              value={clientInfo.name}
              onChange={handleRegularInputChange}
              className="retro-input bg-muted text-muted-foreground"
              readOnly={true}
            />
          )}
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
      
      {/* Enhanced client selection feedback */}
      <ClientSelectionFeedback
        selectedClient={selectedClient}
        isVisible={isExistingClient && !isEditingDetails}
      />
      
      {/* Hidden field for client ID */}
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
