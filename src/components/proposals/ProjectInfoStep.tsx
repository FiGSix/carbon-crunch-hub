
import React, { useState } from "react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { ProjectInfoForm } from "@/components/proposals/project-info/ProjectInfoForm";
import { ProjectInfoHelpCard } from "@/components/proposals/project-info/ProjectInfoHelpCard";
import { ProjectInfoStepFooter } from "@/components/proposals/project-info/ProjectInfoStepFooter";
import { ProjectInformation } from "@/types/proposals";
import { useToast } from "@/hooks/use-toast";

interface ProjectInfoStepProps {
  projectInfo: ProjectInformation;
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
  const { toast } = useToast();
  const [addressInputError, setAddressInputError] = useState(false);

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

  // Handle address input errors
  const handleAddressError = (hasError: boolean) => {
    setAddressInputError(hasError);
    if (hasError) {
      toast({
        title: "Address Input Issue",
        description: "There's a problem with the Google Maps integration. Check your API key configuration.",
        variant: "destructive"
      });
    }
  };

  // Form validation checks
  const isFormValid = Boolean(
    projectInfo.name && 
    projectInfo.address && 
    projectInfo.size && 
    projectInfo.commissionDate && 
    !addressInputError
  );
  
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
          <ProjectInfoForm 
            projectInfo={projectInfo} 
            updateProjectInfo={updateProjectInfo} 
            handleAddressChange={handleAddressChange}
          />
          <ProjectInfoHelpCard />
        </div>
      </CardContent>
      
      <ProjectInfoStepFooter 
        nextStep={nextStep} 
        prevStep={prevStep} 
        isFormValid={isFormValid} 
      />
    </Card>
  );
}
