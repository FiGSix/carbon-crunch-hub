
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
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, ArrowRight, Calendar, HelpCircle } from "lucide-react";
import { GoogleAddressAutocomplete } from "@/components/common/GoogleAddressAutocomplete";

interface ProjectInfoStepProps {
  projectInfo: {
    name: string;
    address: string;
    size: string;
    commissionDate: string;
    additionalNotes: string;
  };
  updateProjectInfo: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  nextStep: () => void;
  prevStep: () => void;
}

export function ProjectInfoStep({ 
  projectInfo, 
  updateProjectInfo, 
  nextStep, 
  prevStep 
}: ProjectInfoStepProps) {
  // Add a direct setter for address field since GoogleAddressAutocomplete 
  // doesn't use standard onChange events
  const handleAddressChange = (address: string) => {
    const mockEvent = {
      target: {
        name: "address",
        value: address
      }
    } as React.ChangeEvent<HTMLTextAreaElement>;
    
    updateProjectInfo(mockEvent);
  };
  
  return (
    <Card className="retro-card">
      <CardHeader>
        <CardTitle>Project Information</CardTitle>
        <CardDescription>
          Enter details about the renewable energy project.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="name">Project Name</Label>
              <Input 
                id="name" 
                name="name" 
                value={projectInfo.name}
                onChange={updateProjectInfo}
                className="retro-input"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="size">System Size (MWp)</Label>
              <Input 
                id="size" 
                name="size" 
                type="number"
                step="0.01"
                min="0"
                max="15"
                value={projectInfo.size}
                onChange={updateProjectInfo}
                className="retro-input"
                required
              />
              <p className="text-xs text-carbon-gray-500">Must be less than 15 MWp</p>
            </div>
            
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="address">Project Address</Label>
              <GoogleAddressAutocomplete
                value={projectInfo.address}
                onChange={handleAddressChange}
                className="retro-input"
                required
                placeholder="Enter the project's physical address"
              />
              <p className="text-xs text-carbon-gray-500">Enter the complete physical address of the project</p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="commissionDate">Commission Date</Label>
              <div className="relative">
                <Input 
                  id="commissionDate" 
                  name="commissionDate" 
                  type="date"
                  value={projectInfo.commissionDate}
                  onChange={updateProjectInfo}
                  className="retro-input"
                  required
                  min="2022-09-15"
                />
                <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-carbon-gray-400 pointer-events-none" />
              </div>
              <p className="text-xs text-carbon-gray-500">Must be on or after September 15, 2022</p>
            </div>
            
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="additionalNotes">Additional Notes (Optional)</Label>
              <Textarea 
                id="additionalNotes" 
                name="additionalNotes" 
                value={projectInfo.additionalNotes}
                onChange={updateProjectInfo}
                className="retro-input"
                rows={3}
              />
            </div>
          </div>
          
          <div className="mt-6 p-4 rounded-lg bg-carbon-green-50 border border-carbon-green-200">
            <div className="flex items-start">
              <HelpCircle className="h-5 w-5 text-carbon-green-500 mr-3 mt-0.5" />
              <div>
                <h3 className="font-medium text-carbon-gray-900">System Size Information</h3>
                <p className="text-sm text-carbon-gray-600 mt-1">
                  The system size should be specified in Megawatt peak (MWp). For example, a 100 kWp system would be entered as 0.1 MWp.
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
          disabled={!projectInfo.name || !projectInfo.address || !projectInfo.size || !projectInfo.commissionDate}
          className="retro-button"
        >
          Next Step <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );
}
