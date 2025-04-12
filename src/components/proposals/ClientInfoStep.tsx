
import React from "react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ArrowLeft, ArrowRight, Info } from "lucide-react";

interface ClientInfoStepProps {
  clientInfo: {
    name: string;
    email: string;
    phone: string;
    companyName: string;
    existingClient: boolean;
  };
  updateClientInfo: (e: React.ChangeEvent<HTMLInputElement>) => void;
  nextStep: () => void;
  prevStep: () => void;
}

export function ClientInfoStep({ 
  clientInfo, 
  updateClientInfo, 
  nextStep, 
  prevStep 
}: ClientInfoStepProps) {
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
          
          <div className="mt-6 p-4 rounded-lg bg-carbon-blue-50 border border-carbon-blue-200">
            <div className="flex items-start">
              <Info className="h-5 w-5 text-carbon-blue-500 mr-3 mt-0.5" />
              <div>
                <h3 className="font-medium text-carbon-gray-900">Client Notification</h3>
                <p className="text-sm text-carbon-gray-600 mt-1">
                  {clientInfo.existingClient ? 
                    "The client will be notified about this proposal through their CrunchCarbon dashboard." : 
                    "A new account will be created for this client, and they will receive an email invitation to view this proposal."
                  }
                </p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between border-t pt-6">
        <Button 
          variant="outline" 
          onClick={prevStep}
          className="retro-button"
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Previous
        </Button>
        <Button 
          onClick={nextStep} 
          disabled={!clientInfo.name || !clientInfo.email}
          className={`retro-button ${clientInfo.name && clientInfo.email ? "bg-carbon-green-500 hover:bg-carbon-green-600 text-white" : "bg-carbon-gray-200 text-carbon-gray-500 cursor-not-allowed"}`}
        >
          Next Step <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );
}
