import { CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight } from "lucide-react";

interface ProjectInfoStepFooterProps {
  nextStep: () => void;
  prevStep: () => void;
  isFormValid: boolean;
}

export function ProjectInfoStepFooter({
  nextStep,
  prevStep,
  isFormValid
}: ProjectInfoStepFooterProps) {
  return (
    <CardFooter className="flex flex-col-reverse gap-3 border-t pt-6 sm:flex-row sm:justify-between sm:gap-2">
      <Button
        variant="outline"
        onClick={prevStep}
        className="retro-button w-full min-h-11 sm:w-auto"
      >
        <ArrowLeft className="mr-2 h-4 w-4" /> Previous
      </Button>
      <Button
        onClick={nextStep}
        disabled={!isFormValid}
        className="retro-button w-full min-h-11 sm:w-auto"
      >
        Next Step <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </CardFooter>
  );
}
