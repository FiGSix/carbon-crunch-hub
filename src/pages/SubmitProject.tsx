import { useState, ChangeEvent } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ClientProposalStepper } from "@/components/client/submit-project/ClientProposalStepper";
import { EligibilityStep } from "@/components/proposals/EligibilityStep";
import { ProjectInfoStep } from "@/components/proposals/ProjectInfoStep";
import { ClientSummaryStep } from "@/components/client/submit-project/ClientSummaryStep";
import { EligibilityCriteria, ProjectInformation } from "@/types/proposals";

type ClientFormStep = "eligibility" | "project" | "summary";

const initialEligibility: EligibilityCriteria = {
  inSouthAfrica: false,
  notRegistered: false,
  under15MWp: false,
  commissionedAfter2022: false,
  legalOwnership: false,
  noGovernmentFunding: false,
};

const initialProjectInfo: ProjectInformation = {
  name: "",
  address: "",
  isMultiPhase: false,
  size: "",
  commissionDate: "",
  additionalNotes: "",
};

export default function SubmitProject() {
  const [currentStep, setCurrentStep] = useState<ClientFormStep>("eligibility");
  const [eligibility, setEligibility] = useState<EligibilityCriteria>(initialEligibility);
  const [projectInfo, setProjectInfo] = useState<ProjectInformation>(initialProjectInfo);

  const isEligible = Object.values(eligibility).every(Boolean);

  const toggleEligibility = (field: keyof EligibilityCriteria) => {
    setEligibility((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const updateProjectInfo = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setProjectInfo((prev) => ({ ...prev, [name]: value }));
  };

  const nextStep = () => {
    if (currentStep === "eligibility") setCurrentStep("project");
    else if (currentStep === "project") setCurrentStep("summary");
  };

  const prevStep = () => {
    if (currentStep === "summary") setCurrentStep("project");
    else if (currentStep === "project") setCurrentStep("eligibility");
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto py-8 px-4">
        <h1 className="text-2xl font-bold mb-2">Submit a Project</h1>
        <p className="text-muted-foreground mb-6">
          Submit your solar project details for carbon credit evaluation.
        </p>

        <ClientProposalStepper currentStep={currentStep} />

        {currentStep === "eligibility" && (
          <EligibilityStep
            eligibility={eligibility}
            toggleEligibility={toggleEligibility}
            isEligible={isEligible}
            nextStep={nextStep}
          />
        )}

        {currentStep === "project" && (
          <ProjectInfoStep
            projectInfo={projectInfo}
            updateProjectInfo={updateProjectInfo}
            nextStep={nextStep}
            prevStep={prevStep}
            setProjectInfo={setProjectInfo}
          />
        )}

        {currentStep === "summary" && (
          <ClientSummaryStep
            eligibility={eligibility}
            projectInfo={projectInfo}
            prevStep={prevStep}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
