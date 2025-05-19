
/**
 * Utility for building proposal data objects with proper validation
 */
import { EligibilityCriteria, ClientInformation, ProjectInformation } from "@/types/proposals";
import { isValidUUID } from "@/utils/validationUtils";
import { convertToSupabaseJson, validateClientId } from "./dataTransformers";
import { logger } from "@/lib/logger";

/**
 * Builds the complete proposal data object for insertion into the database
 */
export function buildProposalData(
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
  const proposalLogger = logger.withContext({
    component: 'ProposalBuilder', 
    method: 'buildProposalData',
    agentId
  });
  
  // Define the structure explicitly without optional fields initially
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
    client_contact_id?: string | null;
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
      revenue: {
        // Sample revenue calculation values
        yearOne: carbonCredits * 50,
        yearTwo: carbonCredits * 52,
        yearThree: carbonCredits * 54,
        yearFour: carbonCredits * 56,
        yearFive: carbonCredits * 58,
      }
    }),
    status: 'draft' // Default status for new proposals
  };

  // Set the appropriate client reference based on client type
  if (clientResult) {
    if (clientResult.isRegisteredUser) {
      // For registered users, set client_id to the user profile ID
      proposalData.client_id = clientResult.clientId;
      proposalData.client_contact_id = null; // Ensure client_contact_id is null
    } else {
      // For non-registered clients, set client_contact_id to the client contact ID
      proposalData.client_contact_id = clientResult.clientId;
      proposalData.client_id = null; // Explicitly set client_id to null
    }
  } else if (selectedClientId) {
    proposalLogger.info("Using selected client ID directly without client result info", { selectedClientId });
  }

  return proposalData;
}
