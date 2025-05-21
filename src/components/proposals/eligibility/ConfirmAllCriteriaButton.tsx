
import React from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";

interface ConfirmAllCriteriaButtonProps {
  onClick: () => void;
}

export function ConfirmAllCriteriaButton({ onClick }: ConfirmAllCriteriaButtonProps) {
  return (
    <div className="p-4 mb-4 rounded-lg bg-carbon-gray-50 border border-carbon-gray-200">
      <Button 
        variant="secondary" 
        className="w-full" 
        onClick={onClick}
      >
        <CheckCircle2 className="mr-2 h-4 w-4" />
        Confirm All Eligibility Criteria
      </Button>
      <p className="text-sm text-carbon-gray-500 mt-2">
        By confirming all criteria, you attest that this project meets all the eligibility requirements listed below.
      </p>
    </div>
  );
}
