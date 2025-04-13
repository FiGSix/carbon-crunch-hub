
import React from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight } from "lucide-react";

interface ClientStepFooterProps {
  nextStep: () => void;
  prevStep: () => void;
  isValid: boolean;
}

export function ClientStepFooter({ nextStep, prevStep, isValid }: ClientStepFooterProps) {
  return (
    <div className="flex justify-between border-t pt-6">
      <Button 
        variant="outline" 
        onClick={prevStep}
        className="retro-button"
      >
        <ArrowLeft className="mr-2 h-4 w-4" /> Previous
      </Button>
      <Button 
        onClick={nextStep} 
        disabled={!isValid}
        className="retro-button"
      >
        Next Step <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </div>
  );
}
