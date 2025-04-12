
import React from "react";
import { CheckCircle2, User, FileText, Clipboard } from "lucide-react";

type FormStep = "eligibility" | "client" | "project" | "summary";

interface ProposalStepperProps {
  currentStep: FormStep;
}

export function ProposalStepper({ currentStep }: ProposalStepperProps) {
  return (
    <div className="mb-8">
      <div className="flex justify-between items-center bg-white p-4 rounded-lg border-2 border-carbon-gray-200 retro-shadow">
        <div 
          className={`flex items-center ${currentStep === "eligibility" || currentStep === "client" || currentStep === "project" || currentStep === "summary" ? "text-carbon-green-600" : "text-carbon-gray-400"}`}
        >
          <div className={`rounded-full w-8 h-8 flex items-center justify-center ${currentStep === "eligibility" || currentStep === "client" || currentStep === "project" || currentStep === "summary" ? "bg-carbon-green-100" : "bg-carbon-gray-100"}`}>
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <span className="ml-2 font-medium">Eligibility</span>
        </div>
        <div className={`h-1 w-16 ${currentStep === "client" || currentStep === "project" || currentStep === "summary" ? "bg-carbon-green-500" : "bg-carbon-gray-200"}`}></div>
        <div 
          className={`flex items-center ${currentStep === "client" || currentStep === "project" || currentStep === "summary" ? "text-carbon-green-600" : "text-carbon-gray-400"}`}
        >
          <div className={`rounded-full w-8 h-8 flex items-center justify-center ${currentStep === "client" || currentStep === "project" || currentStep === "summary" ? "bg-carbon-green-100" : "bg-carbon-gray-100"}`}>
            <User className="h-5 w-5" />
          </div>
          <span className="ml-2 font-medium">Client Info</span>
        </div>
        <div className={`h-1 w-16 ${currentStep === "project" || currentStep === "summary" ? "bg-carbon-green-500" : "bg-carbon-gray-200"}`}></div>
        <div 
          className={`flex items-center ${currentStep === "project" || currentStep === "summary" ? "text-carbon-green-600" : "text-carbon-gray-400"}`}
        >
          <div className={`rounded-full w-8 h-8 flex items-center justify-center ${currentStep === "project" || currentStep === "summary" ? "bg-carbon-green-100" : "bg-carbon-gray-100"}`}>
            <FileText className="h-5 w-5" />
          </div>
          <span className="ml-2 font-medium">Project Info</span>
        </div>
        <div className={`h-1 w-16 ${currentStep === "summary" ? "bg-carbon-green-500" : "bg-carbon-gray-200"}`}></div>
        <div 
          className={`flex items-center ${currentStep === "summary" ? "text-carbon-green-600" : "text-carbon-gray-400"}`}
        >
          <div className={`rounded-full w-8 h-8 flex items-center justify-center ${currentStep === "summary" ? "bg-carbon-green-100" : "bg-carbon-gray-100"}`}>
            <Clipboard className="h-5 w-5" />
          </div>
          <span className="ml-2 font-medium">Summary</span>
        </div>
      </div>
    </div>
  );
}
