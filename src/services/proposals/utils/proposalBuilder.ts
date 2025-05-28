
/**
 * Utility for building proposal data objects with proper validation
 */
import { EligibilityCriteria, ClientInformation, ProjectInformation } from "@/types/proposals";
import { isValidUUID } from "@/utils/validationUtils";
import { convertToSupabaseJson, validateClientId } from "./dataTransformers";
import { logger } from "@/lib/logger";
import { calculateRevenue, getClientSharePercentage, getAgentCommissionPercentage } from "@/lib/calculations/carbon";
import { calculateClientPortfolio } from "../portfolioCalculationService";

/**
 * Builds the complete proposal data object for insertion into the database
 */
export async function buildProposalData(
  title: string,
  agentId: string,
  eligibilityCriteria: EligibilityCriteria,
  projectInfo: ProjectInformation,
  clientInfo: ClientInformation,
  annualEnergy: number,
  carbonCredits: number,
  selectedClientId?: string,
  clientResult?: { clientId: string, isRegisteredUser: boolean }
) {
  const proposalLogger = logger.withContext({
    component: 'ProposalBuilder', 
    method: 'buildProposalData',
    agentId
  });
  
  // Calculate portfolio-based percentages
  let clientShare = 63; // Default fallback
  let agentCommission = 4; // Default fallback
  
  try {
    // Determine the client ID for portfolio calculation
    const portfolioClientId = selectedClientId || clientResult?.clientId;
    
    if (portfolioClientId) {
      proposalLogger.info("Calculating portfolio-based percentages", { portfolioClientId });
      
      // Get the client's existing portfolio
      const portfolio = await calculateClientPortfolio(portfolioClientId);
      
      // Add current project size to get total portfolio
      const currentProjectSize = parseFloat(projectInfo.size) || 0;
      const totalPortfolioSize = portfolio.totalKWp + currentProjectSize;
      
      // Calculate percentages based on total portfolio
      clientShare = getClientSharePercentage(totalPortfolioSize);
      agentCommission = getAgentCommissionPercentage(totalPortfolioSize);
      
      proposalLogger.info("Portfolio-based calculation complete", {
        existingPortfolio: portfolio.totalKWp,
        currentProject: currentProjectSize,
        totalPortfolio: totalPortfolioSize,
        clientShare,
        agentCommission
      });
    } else {
      proposalLogger.info("No client ID available, using current project size only");
      const currentProjectSize = parseFloat(projectInfo.size) || 0;
      clientShare = getClientSharePercentage(currentProjectSize);
      agentCommission = getAgentCommissionPercentage(currentProjectSize);
    }
  } catch (error) {
    proposalLogger.error("Error calculating portfolio percentages, using defaults", { error });
  }
  
  // Calculate revenue with commission date for pro-rata logic
  const revenue = calculateRevenue(projectInfo.size, projectInfo.commissionDate);
  
  // Define the structure explicitly with client_reference_id
  const proposalData: {
    title: string;
    agent_id: string;
    eligibility_criteria: any;
    project_info: any;
    annual_energy: number;
    carbon_credits: number;
    client_share_percentage: number;
    agent_commission_percentage: number;
    content: any;
    status: string;
    client_id?: string | null; 
    client_reference_id?: string | null;
  } = {
    title,
    agent_id: agentId,
    eligibility_criteria: convertToSupabaseJson(eligibilityCriteria),
    project_info: convertToSupabaseJson(projectInfo),
    annual_energy: annualEnergy,
    carbon_credits: carbonCredits,
    client_share_percentage: clientShare,
    agent_commission_percentage: agentCommission,
    content: convertToSupabaseJson({
      clientInfo,
      projectInfo,
      revenue
    }),
    status: 'draft' // Default status for new proposals
  };

  // Set the appropriate client reference based on client type
  if (clientResult) {
    if (clientResult.isRegisteredUser) {
      // For registered users, set client_id to the user profile ID
      proposalData.client_id = clientResult.clientId;
      proposalData.client_reference_id = null; // Ensure client_reference_id is null
    } else {
      // For non-registered clients, set client_reference_id to the client contact ID
      proposalData.client_reference_id = clientResult.clientId;
      proposalData.client_id = null; // Explicitly set client_id to null
    }
  } else if (selectedClientId) {
    proposalLogger.info("Using selected client ID directly without client result info", { selectedClientId });
  }

  return proposalData;
}

/**
 * Legacy function for backward compatibility - now calls the async version
 */
export function buildProposalDataSync(
  title: string,
  agentId: string,
  eligibilityCriteria: EligibilityCriteria,
  projectInfo: ProjectInformation,
  clientInfo: ClientInformation,
  annualEnergy: number,
  carbonCredits: number,
  clientShare: number,
  agentCommission: number,
  selectedClientId?: string,
  clientResult?: { clientId: string, isRegisteredUser: boolean }
) {
  const revenue = calculateRevenue(projectInfo.size, projectInfo.commissionDate);
  
  // Define the structure explicitly with client_reference_id
  const proposalData: {
    title: string;
    agent_id: string;
    eligibility_criteria: any;
    project_info: any;
    annual_energy: number;
    carbon_credits: number;
    client_share_percentage: number;
    agent_commission_percentage: number;
    content: any;
    status: string;
    client_id?: string | null; 
    client_reference_id?: string | null;
  } = {
    title,
    agent_id: agentId,
    eligibility_criteria: convertToSupabaseJson(eligibilityCriteria),
    project_info: convertToSupabaseJson(projectInfo),
    annual_energy: annualEnergy,
    carbon_credits: carbonCredits,
    client_share_percentage: clientShare,
    agent_commission_percentage: agentCommission,
    content: convertToSupabaseJson({
      clientInfo,
      projectInfo,
      revenue
    }),
    status: 'draft' // Default status for new proposals
  };

  // Set the appropriate client reference based on client type
  if (clientResult) {
    if (clientResult.isRegisteredUser) {
      proposalData.client_id = clientResult.clientId;
      proposalData.client_reference_id = null;
    } else {
      proposalData.client_reference_id = clientResult.clientId;
      proposalData.client_id = null;
    }
  }

  return proposalData;
}
