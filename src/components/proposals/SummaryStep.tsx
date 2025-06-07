
import React from "react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { EligibilityCriteria, ClientInformation, ProjectInformation } from "./types";
import { ClientInformationSection } from "./summary/ClientInformationSection";
import { ProjectInformationSection } from "./summary/ProjectInformationSection";
import { CarbonCreditSection } from "./summary/CarbonCreditSection";
import { RevenueDistributionSection } from "./summary/RevenueDistributionSection";
import { ProposalSubmitForm } from "./summary/ProposalSubmitForm";

interface SummaryStepProps {
  eligibility: EligibilityCriteria;
  clientInfo: ClientInformation;
  projectInfo: ProjectInformation;
  nextStep: () => void;
  prevStep: () => void;
  selectedClientId?: string | null;
  proposalId?: string | null; // Add proposal ID parameter (null for new proposals)
}

export function SummaryStep({ 
  eligibility,
  clientInfo, 
  projectInfo, 
  nextStep, 
  prevStep,
  selectedClientId,
  proposalId
}: SummaryStepProps) {
  return (
    <Card className="retro-card">
      <CardHeader>
        <CardTitle>Proposal Summary</CardTitle>
        <CardDescription>
          Review the proposal details before finalizing.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-8">
          <ClientInformationSection clientInfo={clientInfo} />
          <ProjectInformationSection projectInfo={projectInfo} />
          <CarbonCreditSection 
            systemSize={projectInfo.size} 
            commissionDate={projectInfo.commissionDate}
            selectedClientId={selectedClientId}
            proposalId={proposalId}
          />
          <RevenueDistributionSection 
            systemSize={projectInfo.size}
            selectedClientId={selectedClientId}
            proposalId={proposalId}
          />
        </div>
      </CardContent>
      <CardFooter>
        <ProposalSubmitForm
          eligibility={eligibility}
          clientInfo={clientInfo}
          projectInfo={projectInfo}
          nextStep={nextStep}
          prevStep={prevStep}
          selectedClientId={selectedClientId}
        />
      </CardFooter>
    </Card>
  );
}
