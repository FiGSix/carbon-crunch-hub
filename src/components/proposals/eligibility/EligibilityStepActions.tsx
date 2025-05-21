
import React from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface EligibilityStepActionsProps {
  isEligible: boolean;
  onNextStep: () => void;
}

export function EligibilityStepActions({
  isEligible,
  onNextStep
}: EligibilityStepActionsProps) {
  const navigate = useNavigate();
  
  return (
    <div className="flex justify-between border-t pt-6">
      <Button 
        variant="outline" 
        onClick={() => navigate("/proposals")}
        className="retro-button"
      >
        <ArrowLeft className="mr-2 h-4 w-4" /> Cancel
      </Button>
      <Button 
        onClick={onNextStep} 
        disabled={!isEligible}
        className="retro-button"
      >
        Next Step <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </div>
  );
}
