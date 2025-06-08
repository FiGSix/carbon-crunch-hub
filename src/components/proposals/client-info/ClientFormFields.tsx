
import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ClientInformation } from "../types";
import { searchClients } from "@/services/proposals/unifiedProposalService";

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
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const handleNameChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    updateClientInfo(e);
    
    const value = e.target.value;
    if (value.length > 2 && setClientInfo) {
      try {
        const results = await searchClients(value);
        setSearchResults(results);
        setShowSuggestions(results.length > 0);
      } catch (error) {
        console.error('Search error:', error);
        setSearchResults([]);
        setShowSuggestions(false);
      }
    } else {
      setSearchResults([]);
      setShowSuggestions(false);
    }
  };

  const selectClient = (client: any) => {
    if (setClientInfo) {
      setClientInfo({
        name: client.name,
        email: client.email,
        phone: "",
        companyName: client.company || "",
        existingClient: true,
      });
    }
    setShowSuggestions(false);
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <Label htmlFor="name">Client Name *</Label>
        <Input
          id="name"
          name="name"
          type="text"
          value={clientInfo.name}
          onChange={handleNameChange}
          placeholder="Enter client name or search existing clients"
          required
        />
        
        {showSuggestions && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
            {searchResults.map((client) => (
              <div
                key={client.id}
                className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                onClick={() => selectClient(client)}
              >
                <div className="font-medium">{client.name}</div>
                <div className="text-sm text-gray-500">{client.email}</div>
                {client.company && (
                  <div className="text-xs text-gray-400">{client.company}</div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <Label htmlFor="email">Email Address *</Label>
        <Input
          id="email"
          name="email"
          type="email"
          value={clientInfo.email}
          onChange={updateClientInfo}
          placeholder="client@example.com"
          required
        />
      </div>

      <div>
        <Label htmlFor="phone">Phone Number</Label>
        <Input
          id="phone"
          name="phone"
          type="tel"
          value={clientInfo.phone}
          onChange={updateClientInfo}
          placeholder="+27 123 456 7890"
        />
      </div>

      <div>
        <Label htmlFor="companyName">Company Name</Label>
        <Input
          id="companyName"
          name="companyName"
          type="text"
          value={clientInfo.companyName}
          onChange={updateClientInfo}
          placeholder="Company Name (optional)"
        />
      </div>
    </div>
  );
}
