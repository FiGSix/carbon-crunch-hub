
import { EligibilityCriteria, ProjectInformation, ClientInformation } from "@/types/proposals";
import { 
  calculateAnnualEnergy, 
  calculateCarbonCredits, 
  getClientSharePercentage,
  getAgentCommissionPercentage,
  calculateRevenue
} from "@/lib/calculations/carbon";
import { logger } from "@/lib/logger";
import { normalizeToKWp } from "@/lib/calculations/carbon/core";

interface ClientResult {
  clientId: string;
  isRegisteredUser: boolean;
}

export async function buildProposalData(
  title: string,
  agentId: string,
  eligibilityCriteria: EligibilityCriteria,
  projectInfo: ProjectInformation,
  clientInfo: ClientInformation,
  annualEnergy: number,
  carbonCredits: number,
  selectedClientId?: string,
  clientResult?: ClientResult
) {
  const proposalLogger = logger.withContext({
    component: 'ProposalBuilder',
    method: 'buildProposalData'
  });

  // Calculate portfolio-based revenue distribution
  const systemSizeKWp = normalizeToKWp(projectInfo.size);
  
  // Use individual calculation functions instead of calculateResults
  const calculatedAnnualEnergy = calculateAnnualEnergy(systemSizeKWp);
  const calculatedCarbonCredits = calculateCarbonCredits(systemSizeKWp);
  const clientSharePercentage = getClientSharePercentage(systemSizeKWp);
  const agentCommissionPercentage = getAgentCommissionPercentage(systemSizeKWp);
  const revenue = calculateRevenue(systemSizeKWp, projectInfo.commissionDate);
  
  proposalLogger.info("Calculated proposal results", {
    systemSizeKWp,
    annualEnergy: calculatedAnnualEnergy,
    carbonCredits: calculatedCarbonCredits,
    clientShare: clientSharePercentage,
    agentCommission: agentCommissionPercentage
  });

  // Determine client IDs based on registration status
  let finalClientId: string | undefined;
  let finalClientReferenceId: string | undefined;

  if (selectedClientId) {
    if (clientResult?.isRegisteredUser) {
      finalClientId = selectedClientId;
      finalClientReferenceId = selectedClientId;
    } else {
      finalClientReferenceId = selectedClientId;
    }
  }

  // Build proposal data with normalized system size
  const proposalData = {
    title,
    agent_id: agentId,
    eligibility_criteria: eligibilityCriteria,
    project_info: projectInfo,
    annual_energy: calculatedAnnualEnergy,
    carbon_credits: calculatedCarbonCredits,
    client_share_percentage: clientSharePercentage,
    agent_commission_percentage: agentCommissionPercentage,
    content: {
      clientInfo,
      projectInfo,
      revenue
    } as any, // Cast to any to satisfy Json type requirement
    status: 'draft',
    system_size_kwp: systemSizeKWp,
    unit_standard: 'kWp',
    ...(finalClientId && { client_id: finalClientId }),
    ...(finalClientReferenceId && { client_reference_id: finalClientReferenceId })
  };

  proposalLogger.info("Built proposal data", {
    title: proposalData.title,
    systemSizeKWp: proposalData.system_size_kwp,
    unitStandard: proposalData.unit_standard,
    clientId: proposalData.client_id,
    clientReferenceId: proposalData.client_reference_id
  });

  return proposalData;
}
