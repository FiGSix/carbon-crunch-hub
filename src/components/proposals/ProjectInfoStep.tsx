
import React from "react";
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

  const isFormValid = Boolean(
    projectInfo.name && projectInfo.address && projectInfo.size && projectInfo.commissionDate
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
