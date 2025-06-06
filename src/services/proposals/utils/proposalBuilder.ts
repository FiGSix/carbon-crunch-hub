
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
import { calculateClientPortfolio } from "../portfolioCalculationService";

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

  // Calculate individual project values
  const systemSizeKWp = normalizeToKWp(projectInfo.size);
  const calculatedAnnualEnergy = calculateAnnualEnergy(systemSizeKWp);
  const calculatedCarbonCredits = calculateCarbonCredits(systemSizeKWp);
  const revenue = calculateRevenue(systemSizeKWp, projectInfo.commissionDate);
  
  // Calculate portfolio-based percentages
  let clientSharePercentage: number;
  let agentCommissionPercentage: number;

  if (selectedClientId) {
    try {
      // Get existing portfolio for the client
      const portfolioData = await calculateClientPortfolio(selectedClientId);
      const totalPortfolioSize = portfolioData.totalKWp + systemSizeKWp; // Include this new project
      
      // Calculate percentages based on total portfolio
      clientSharePercentage = getClientSharePercentage(totalPortfolioSize);
      agentCommissionPercentage = getAgentCommissionPercentage(totalPortfolioSize);
      
      proposalLogger.info("Portfolio-based calculation", {
        existingPortfolioKWp: portfolioData.totalKWp,
        newProjectKWp: systemSizeKWp,
        totalPortfolioKWp: totalPortfolioSize,
        clientShare: clientSharePercentage,
        agentCommission: agentCommissionPercentage
      });
    } catch (error) {
      proposalLogger.warn("Failed to calculate portfolio-based percentages, using individual project", {
        error: error instanceof Error ? error.message : String(error)
      });
      
      // Fallback to individual project calculation
      clientSharePercentage = getClientSharePercentage(systemSizeKWp);
      agentCommissionPercentage = getAgentCommissionPercentage(systemSizeKWp);
    }
  } else {
    // No client selected, use individual project calculation
    clientSharePercentage = getClientSharePercentage(systemSizeKWp);
    agentCommissionPercentage = getAgentCommissionPercentage(systemSizeKWp);
  }

  proposalLogger.info("Final calculated values", {
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

  // Build proposal data with portfolio-aware percentages
  const proposalData = {
    title,
    agent_id: agentId,
    eligibility_criteria: eligibilityCriteria as any,
    project_info: projectInfo as any,
    annual_energy: calculatedAnnualEnergy,
    carbon_credits: calculatedCarbonCredits,
    client_share_percentage: clientSharePercentage,
    agent_commission_percentage: agentCommissionPercentage,
    content: {
      clientInfo,
      projectInfo,
      revenue
    } as any,
    status: 'draft',
    system_size_kwp: systemSizeKWp,
    unit_standard: 'kWp',
    ...(finalClientId && { client_id: finalClientId }),
    ...(finalClientReferenceId && { client_reference_id: finalClientReferenceId })
  };

  proposalLogger.info("Built proposal data with portfolio awareness", {
    title: proposalData.title,
    systemSizeKWp: proposalData.system_size_kwp,
    clientSharePercentage: proposalData.client_share_percentage,
    agentCommissionPercentage: proposalData.agent_commission_percentage
  });

  return proposalData;
}
