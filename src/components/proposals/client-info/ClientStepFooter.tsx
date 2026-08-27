import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight } from "lucide-react";

interface ClientStepFooterProps {
  nextStep: () => void;
  prevStep: () => void;
  isValid: boolean;
}

export function ClientStepFooter({ nextStep, prevStep, isValid }: ClientStepFooterProps) {
  return (
    <div className="flex w-full flex-col-reverse gap-3 border-t pt-6 sm:flex-row sm:justify-between sm:gap-2">
      <Button
        variant="outline"
        onClick={prevStep}
        className="retro-button w-full min-h-11 sm:w-auto"
      >
        <ArrowLeft className="mr-2 h-4 w-4" /> Previous
      </Button>
      <Button
        onClick={nextStep}
        disabled={!isValid}
        className="retro-button w-full min-h-11 sm:w-auto"
      >
        Next Step <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </div>
  );
}
