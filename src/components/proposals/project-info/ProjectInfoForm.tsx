
import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Calendar } from "lucide-react";
import { SecureGoogleAddressAutocomplete } from "@/components/common/SecureGoogleAddressAutocomplete";
import { AddressInputMode } from "@/components/common/AddressInputMode";
import { MapAddressPicker } from "@/components/common/MapAddressPicker";
import { ProjectInformation } from "@/types/proposals";
import { getMinimumDateString } from "@/utils/dateValidation";
import { ProjectPhasesInput } from "./ProjectPhasesInput";

interface ProjectInfoFormProps {
  projectInfo: ProjectInformation;
  updateProjectInfo: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  handleAddressChange: (address: string) => void;
  onPhaseToggle?: (isMultiPhase: boolean) => void;
  onPhasesChange?: (phases: any[]) => void;
}

export function ProjectInfoForm({
  projectInfo,
  updateProjectInfo,
  handleAddressChange,
  onPhaseToggle,
  onPhasesChange
}: ProjectInfoFormProps) {
  const [mapsError, setMapsError] = useState(false);
  const [addressMode, setAddressMode] = useState<'search' | 'map'>('search');

  const handleMapsError = (hasError: boolean) => {
    setMapsError(hasError);
  };

  const handleMapLocationSelect = (lat: number, lng: number, address: string) => {
    // Create a synthetic event to update project info with all location data
    const event = {
      target: {
        name: 'address',
        value: address
      }
    } as React.ChangeEvent<HTMLInputElement>;
    
    updateProjectInfo(event);
    
    // Also store GPS coordinates (we'll need to handle this in the parent)
    const gpsEvent = {
      target: {
        name: 'gpsData',
        value: JSON.stringify({ lat, lng, addressSource: 'pin_drop' })
      }
    } as React.ChangeEvent<HTMLInputElement>;
    updateProjectInfo(gpsEvent);
    
    setAddressMode('search'); // Switch back to search view after selection
  };

  return (
    <div className="space-y-6">
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
        
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="address">Project Address</Label>
          <AddressInputMode mode={addressMode} onModeChange={setAddressMode} />
          
          {addressMode === 'search' ? (
            <>
              <SecureGoogleAddressAutocomplete
                value={projectInfo.address}
                onChange={handleAddressChange}
                className="retro-input"
                required
                placeholder="Enter the project's physical address"
                onError={handleMapsError}
              />
              <p className="text-xs text-muted-foreground">
                Can't find your address? Try "Pin Drop on Map" for rural locations
              </p>
            </>
          ) : (
            <MapAddressPicker
              onLocationSelect={handleMapLocationSelect}
              initialLat={projectInfo.gpsLat}
              initialLng={projectInfo.gpsLng}
            />
          )}
          
          {projectInfo.gpsLat && projectInfo.gpsLng && (
            <p className="text-xs text-muted-foreground">
              GPS: {projectInfo.gpsLat.toFixed(6)}, {projectInfo.gpsLng.toFixed(6)}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-4 p-4 border rounded-lg bg-card">
        <Label className="text-base font-semibold">Project Type</Label>
        <RadioGroup
          value={projectInfo.isMultiPhase ? "multi" : "single"}
          onValueChange={(value) => onPhaseToggle?.(value === "multi")}
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="single" id="single" />
            <Label htmlFor="single" className="font-normal cursor-pointer">
              Single-Phase Project
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="multi" id="multi" />
            <Label htmlFor="multi" className="font-normal cursor-pointer">
              Multi-Phase Project (multiple commissioning dates)
            </Label>
          </div>
        </RadioGroup>
      </div>

      {projectInfo.isMultiPhase ? (
        <ProjectPhasesInput
          phases={projectInfo.phases || [{ phaseNumber: 1, sizeKWp: 0, commissionDate: "" }]}
          onChange={onPhasesChange || (() => {})}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="size">System Size (kWp)</Label>
            <Input 
              id="size" 
              name="size" 
              type="number"
              step="0.01"
              min="0"
              max="15000"
              value={projectInfo.size}
              onChange={updateProjectInfo}
              className="retro-input"
              required
            />
            <p className="text-xs text-carbon-gray-500">Must be less than 15,000 kWp</p>
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
                min={getMinimumDateString()}
              />
              <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-carbon-gray-400 pointer-events-none" />
            </div>
            <p className="text-xs text-carbon-gray-500">Must be on or after September 15, 2022</p>
          </div>
        </div>
      )}

      <div className="space-y-2">
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
