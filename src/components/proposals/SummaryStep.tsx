

import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { EligibilityCriteria, ClientInformation, ProjectInformation, AdditionalClient } from "./types";
import { ClientInformationSection } from "./summary/ClientInformationSection";
import { ProjectInformationSection } from "./summary/ProjectInformationSection";
import { CarbonCreditSection } from "./summary/CarbonCreditSection";
import { RevenueDistributionSection } from "./summary/RevenueDistributionSection";
import { ProposalSubmitFormReliable } from "./summary/ProposalSubmitFormReliable";

interface SummaryStepProps {
  eligibility: EligibilityCriteria;
  clientInfo: ClientInformation;
  projectInfo: ProjectInformation;
  nextStep: () => void;
  prevStep: () => void;
  selectedClientId?: string | null;
  proposalId?: string | null;
  additionalClients?: AdditionalClient[];
}

export function SummaryStep({ 
  eligibility,
  clientInfo, 
  projectInfo, 
  nextStep, 
  prevStep,
  selectedClientId,
  proposalId,
  additionalClients
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
          <ClientInformationSection clientInfo={clientInfo} additionalClients={additionalClients} />
          <ProjectInformationSection projectInfo={projectInfo} />
          <CarbonCreditSection 
            systemSize={projectInfo.size} 
            commissionDate={projectInfo.commissionDate}
            selectedClientId={selectedClientId}
            proposalId={proposalId}
            phases={projectInfo.phases}
            isMultiPhase={projectInfo.isMultiPhase}
          />
          <RevenueDistributionSection 
            systemSize={projectInfo.size}
            selectedClientId={selectedClientId}
            proposalId={proposalId}
            isClient={false}
          />
        </div>
      </CardContent>
      <CardFooter>
          <ProposalSubmitFormReliable
            eligibility={eligibility}
            clientInfo={clientInfo}
            projectInfo={projectInfo}
            nextStep={nextStep}
            prevStep={prevStep}
            selectedClientId={selectedClientId}
            additionalClients={additionalClients}
          />
      </CardFooter>
    </Card>
  );
}
