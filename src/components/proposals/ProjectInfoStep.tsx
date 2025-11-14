
import { useState, ChangeEvent } from "react";
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
  updateProjectInfo: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  nextStep: () => void;
  prevStep: () => void;
  setProjectInfo?: (info: ProjectInformation) => void;
}

export function ProjectInfoStep({ 
  projectInfo, 
  updateProjectInfo, 
  nextStep, 
  prevStep,
  setProjectInfo
}: ProjectInfoStepProps) {
  const { toast } = useToast();
  const [addressInputError, setAddressInputError] = useState(false);
  const [showDateRejectionDialog, setShowDateRejectionDialog] = useState(false);
  const [dateValidationError, setDateValidationError] = useState<string | null>(null);

  // Enhanced project info handler with date validation and GPS data
  const handleProjectInfoChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    // Handle GPS data from map picker
    if (name === 'gpsData' && setProjectInfo) {
      try {
        const gpsData = JSON.parse(value);
        setProjectInfo({
          ...projectInfo,
          gpsLat: gpsData.lat,
          gpsLng: gpsData.lng,
          addressSource: gpsData.addressSource
        });
        return;
      } catch (error) {
        console.error('Failed to parse GPS data:', error);
      }
    }
    
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

  // Add a direct setter for address field
  const handleAddressChange = (address: string) => {
    if (setProjectInfo) {
      setProjectInfo({
        ...projectInfo,
        address,
        addressSource: 'autocomplete'
      });
    } else {
      const mockEvent = {
        target: {
          name: "address",
          value: address
        }
      } as ChangeEvent<HTMLTextAreaElement>;
      
      updateProjectInfo(mockEvent);
    }
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

  // Validate form before proceeding to next step
  const validateAndProceed = () => {
    const missingFields: string[] = [];
    
    if (!projectInfo.name) missingFields.push("Project Name");
    if (!projectInfo.address) missingFields.push("Project Address");
    
    if (projectInfo.isMultiPhase) {
      if (!projectInfo.phases?.length) {
        missingFields.push("Project Phases");
      }
    } else {
      if (!projectInfo.size) missingFields.push("System Size");
      if (!projectInfo.commissionDate) missingFields.push("Commission Date");
    }
    
    if (missingFields.length > 0) {
      toast({
        title: "Missing Required Fields",
        description: `Please complete: ${missingFields.join(", ")}`,
        variant: "destructive"
      });
      return;
    }
    
    if (dateValidationError) {
      toast({
        title: "Invalid Date",
        description: dateValidationError,
        variant: "destructive"
      });
      return;
    }
    
    nextStep();
  };

  // Handle phase toggle
  const handlePhaseToggle = (isMultiPhase: boolean) => {
    if (setProjectInfo) {
      setProjectInfo({
        ...projectInfo,
        isMultiPhase,
        phases: isMultiPhase ? [{ phaseNumber: 1, sizeKWp: 0, commissionDate: "" }] : []
      });
    }
  };

  // Handle phases change
  const handlePhasesChange = (phases: any[]) => {
    if (setProjectInfo) {
      const totalSize = phases.reduce((sum, p) => sum + (p.sizeKWp || 0), 0);
      setProjectInfo({
        ...projectInfo,
        phases,
        totalSystemSize: totalSize
      });
    }
  };

  // Form validation checks
  const isFormValid = projectInfo.isMultiPhase
    ? Boolean(
        projectInfo.name &&
        projectInfo.address &&
        projectInfo.phases &&
        projectInfo.phases.length > 0 &&
        projectInfo.phases.every(p => p.sizeKWp > 0 && p.commissionDate) &&
        (projectInfo.totalSystemSize || 0) < 15000 &&
        !addressInputError &&
        !dateValidationError
      )
    : Boolean(
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
            onPhaseToggle={handlePhaseToggle}
            onPhasesChange={handlePhasesChange}
          />
          <ProjectInfoHelpCard />
        </div>
      </CardContent>
      
      <ProjectInfoStepFooter 
        nextStep={validateAndProceed} 
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
