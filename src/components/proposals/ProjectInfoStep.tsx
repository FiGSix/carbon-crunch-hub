
import React, { useState } from "react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { ProjectInfoFormWithConflictCheck } from "@/components/proposals/project-info/ProjectInfoFormWithConflictCheck";
import { ProjectInfoHelpCard } from "@/components/proposals/project-info/ProjectInfoHelpCard";
import { ProjectInfoStepFooter } from "@/components/proposals/project-info/ProjectInfoStepFooter";
import { DateRejectionDialog } from "@/components/proposals/project-info/DateRejectionDialog";
import { ProjectInformation } from "@/types/proposals";
import { useToast } from "@/hooks/use-toast";
import { validateCommissionDate } from "@/utils/dateValidation";

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
  const [showDateRejectionDialog, setShowDateRejectionDialog] = useState(false);
  const [dateValidationError, setDateValidationError] = useState<string | null>(null);

  // Enhanced project info handler with date validation
  const handleProjectInfoChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    // If it's the commission date, validate it
    if (name === 'commissionDate' && value) {
      const validation = validateCommissionDate(value);
      if (!validation.isValid) {
        setDateValidationError(validation.error || 'Invalid date');
        if (validation.error?.includes('date constraints')) {
          setShowDateRejectionDialog(true);
        }
      } else {
        setDateValidationError(null);
      }
    }
    
    // Call the original update function
    updateProjectInfo(e);
  };

  // Add a direct setter for address field since SecureGoogleAddressAutocomplete 
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
    !addressInputError &&
    !dateValidationError
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
          <ProjectInfoFormWithConflictCheck 
            projectInfo={projectInfo} 
            updateProjectInfo={handleProjectInfoChange} 
            handleAddressChange={handleAddressChange}
            dateValidationError={dateValidationError}
          />
          <ProjectInfoHelpCard />
        </div>
      </CardContent>
      
      <ProjectInfoStepFooter 
        nextStep={nextStep} 
        prevStep={prevStep} 
        isFormValid={isFormValid} 
      />
      
      <DateRejectionDialog
        open={showDateRejectionDialog}
        onClose={() => setShowDateRejectionDialog(false)}
      />
    </Card>
  );
}
