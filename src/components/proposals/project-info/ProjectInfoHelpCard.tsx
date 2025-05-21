
import React from "react";
import { HelpCircle } from "lucide-react";

export function ProjectInfoHelpCard() {
  return (
    <div className="mt-6 p-4 rounded-lg bg-carbon-green-50 border border-carbon-green-200">
      <div className="flex items-start">
        <HelpCircle className="h-5 w-5 text-carbon-green-500 mr-3 mt-0.5" />
        <div>
          <h3 className="font-medium text-carbon-gray-900">System Size Information</h3>
          <p className="text-sm text-carbon-gray-600 mt-1">
            The system size should be specified in Megawatt peak (MWp). For example, a 100 kWp system would be entered as 0.1 MWp.
          </p>
        </div>
      </div>
    </div>
  );
}
