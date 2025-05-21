
import React from "react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { EligibilityCriteria } from "@/types/proposals";
import { ConfirmAllCriteriaButton } from "./eligibility/ConfirmAllCriteriaButton";
import { EligibilityCriteriaList } from "./eligibility/EligibilityCriteriaList";
import { EligibilityStatus } from "./eligibility/EligibilityStatus";
import { EligibilityStepActions } from "./eligibility/EligibilityStepActions";

interface EligibilityStepProps {
  eligibility: EligibilityCriteria;
  toggleEligibility: (field: keyof EligibilityCriteria) => void;
  isEligible: boolean;
  nextStep: () => void;
}

export function EligibilityStep({ 
  eligibility, 
  toggleEligibility, 
  isEligible, 
  nextStep 
}: EligibilityStepProps) {
  // Function to confirm all eligibility criteria at once
  const confirmAllCriteria = () => {
    Object.keys(eligibility).forEach((key) => {
      if (!eligibility[key as keyof EligibilityCriteria]) {
        toggleEligibility(key as keyof EligibilityCriteria);
      }
    });
  };

  return (
    <Card className="retro-card">
      <CardHeader>
        <CardTitle>Eligibility Check</CardTitle>
        <CardDescription>
          Verify that the project meets all eligibility criteria for carbon credits.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <ConfirmAllCriteriaButton onClick={confirmAllCriteria} />
        
        <EligibilityCriteriaList 
          eligibility={eligibility} 
          toggleEligibility={toggleEligibility} 
        />
        
        <div className="mt-6 p-4 rounded-lg bg-carbon-gray-50 border border-carbon-gray-200">
          <EligibilityStatus isEligible={isEligible} />
        </div>
      </CardContent>
      <CardFooter>
        <EligibilityStepActions 
          isEligible={isEligible} 
          onNextStep={nextStep} 
        />
      </CardFooter>
    </Card>
  );
}
