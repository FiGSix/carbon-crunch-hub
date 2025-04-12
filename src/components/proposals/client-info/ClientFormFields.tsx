
import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";

interface ClientFormFieldsProps {
  clientInfo: {
    name: string;
    email: string;
    phone: string;
    companyName: string;
    existingClient: boolean;
  };
  updateClientInfo: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function ClientFormFields({ clientInfo, updateClientInfo }: ClientFormFieldsProps) {
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
    </div>
  );
}
