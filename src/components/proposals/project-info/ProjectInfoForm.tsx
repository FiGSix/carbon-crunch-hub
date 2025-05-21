
import React, { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar, AlertTriangle } from "lucide-react";
import { GoogleAddressAutocomplete } from "@/components/common/GoogleAddressAutocomplete";
import { ProjectInformation } from "@/types/proposals";

interface ProjectInfoFormProps {
  projectInfo: ProjectInformation;
  updateProjectInfo: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  handleAddressChange: (address: string) => void;
}

export function ProjectInfoForm({
  projectInfo,
  updateProjectInfo,
  handleAddressChange
}: ProjectInfoFormProps) {
  const [mapsError, setMapsError] = useState(false);

  const handleMapsError = (hasError: boolean) => {
    setMapsError(hasError);
  };

  return (
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
          onError={handleMapsError}
        />
        {mapsError && (
          <div className="flex items-center text-amber-500 text-sm mt-1">
            <AlertTriangle className="h-4 w-4 mr-1" />
            <span>Add your Google Maps API key to the .env file and restart the server</span>
          </div>
        )}
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
  );
}
