
import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useNavigate } from "react-router-dom";
import { ProposalStepper } from "@/components/proposals/ProposalStepper";
import { EligibilityStep } from "@/components/proposals/EligibilityStep";
import { ClientInfoStep } from "@/components/proposals/ClientInfoStep";
import { ProjectInfoStep } from "@/components/proposals/ProjectInfoStep";
import { SummaryStep } from "@/components/proposals/SummaryStep";
import { FormStep, EligibilityCriteria, ClientInformation, ProjectInformation } from "@/types/proposals";
import { useToast } from "@/hooks/use-toast";

const CreateProposal = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState<FormStep>("eligibility");
  
  // Form state
  const [eligibility, setEligibility] = useState<EligibilityCriteria>({
    inSouthAfrica: false,
    notRegistered: false,
    under15MWp: false,
    commissionedAfter2022: false,
    legalOwnership: false,
  });
  
  const [clientInfo, setClientInfo] = useState<ClientInformation>({
    name: "",
    email: "",
    phone: "",
    companyName: "",
    existingClient: false,
  });
  
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  
  const [projectInfo, setProjectInfo] = useState<ProjectInformation>({
    name: "",
    address: "",
    size: "",
    commissionDate: "",
    additionalNotes: "",
  });
  
  const isEligible = Object.values(eligibility).every(value => value === true);
  
  const nextStep = () => {
    switch (step) {
      case "eligibility":
        setStep("client");
        break;
      case "client":
        setStep("project");
        break;
      case "project":
        setStep("summary");
        break;
      case "summary":
        navigate("/proposals");
        break;
    }
  };
  
  const prevStep = () => {
    switch (step) {
      case "client":
        setStep("eligibility");
        break;
      case "project":
        setStep("client");
        break;
      case "summary":
        setStep("project");
        break;
    }
  };
  
  const toggleEligibility = (field: keyof EligibilityCriteria) => {
    setEligibility(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };
  
  const updateClientInfo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setClientInfo(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }));
    
    if (selectedClientId && name !== "existingClient") {
      setSelectedClientId(null);
    }
  };
  
  const setClientInfoDirectly = (newClientInfo: ClientInformation) => {
    setClientInfo(newClientInfo);
  };
  
  const updateProjectInfo = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setProjectInfo(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-carbon-gray-900">Create Proposal</h1>
        <p className="text-carbon-gray-600">Generate a new carbon credit proposal for a client or project.</p>
      </div>
      
      <ProposalStepper currentStep={step} />
      
      {step === "eligibility" && (
        <EligibilityStep 
          eligibility={eligibility} 
          toggleEligibility={toggleEligibility} 
          isEligible={isEligible}
          nextStep={nextStep}
        />
      )}
      
      {step === "client" && (
        <ClientInfoStep 
          clientInfo={clientInfo}
          updateClientInfo={updateClientInfo}
          nextStep={nextStep}
          prevStep={prevStep}
          setClientInfo={setClientInfoDirectly}
          selectedClientId={selectedClientId}
          setSelectedClientId={setSelectedClientId}
        />
      )}
      
      {step === "project" && (
        <ProjectInfoStep
          projectInfo={projectInfo}
          updateProjectInfo={updateProjectInfo}
          nextStep={nextStep}
          prevStep={prevStep}
        />
      )}
      
      {step === "summary" && (
        <SummaryStep
          eligibility={eligibility}
          clientInfo={clientInfo}
          projectInfo={projectInfo}
          nextStep={nextStep}
          prevStep={prevStep}
          selectedClientId={selectedClientId}
          proposalId={null}
        />
      )}
    </DashboardLayout>
  );
};

export default CreateProposal;
