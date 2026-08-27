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
    <div className="flex w-full flex-col-reverse gap-3 border-t pt-6 sm:flex-row sm:justify-between sm:gap-2">
      <Button
        variant="outline"
        onClick={() => navigate("/proposals")}
        className="retro-button w-full min-h-11 sm:w-auto"
      >
        <ArrowLeft className="mr-2 h-4 w-4" /> Cancel
      </Button>
      <Button
        onClick={onNextStep}
        disabled={!isEligible}
        className="retro-button w-full min-h-11 sm:w-auto"
      >
        Next Step <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </div>
  );
}
