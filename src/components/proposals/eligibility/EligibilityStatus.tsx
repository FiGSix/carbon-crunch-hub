
import React from "react";
import { CheckCircle2, CircleX } from "lucide-react";

interface EligibilityStatusProps {
  isEligible: boolean;
}

export function EligibilityStatus({ isEligible }: EligibilityStatusProps) {
  return (
    <div className="flex items-start">
      <div className="mr-3">
        {isEligible ? 
          <CheckCircle2 className="h-6 w-6 text-carbon-green-500" /> : 
          <CircleX className="h-6 w-6 text-destructive" />
        }
      </div>
      <div>
        <h3 className="font-medium text-carbon-gray-900">
          {isEligible ? 
            "Project is eligible for carbon credits" : 
            "Project does not meet all eligibility criteria"
          }
        </h3>
        <p className="text-sm text-carbon-gray-600 mt-1">
          {isEligible ? 
            "This project meets all the requirements to generate carbon credits through CrunchCarbon." : 
            "Please ensure all eligibility criteria are met before proceeding."
          }
        </p>
      </div>
    </div>
  );
}
