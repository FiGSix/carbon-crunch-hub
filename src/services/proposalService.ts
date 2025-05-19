
import { 
  createProposal as createProposalImpl, 
  type ProposalCreationResult 
} from "./proposals/proposalCreationService";
import { EligibilityCriteria, ClientInformation, ProjectInformation } from "@/types/proposals";
import { logger } from "@/lib/logger";

// Simplified wrapper that provides a more user-friendly interface to the component
export async function createProposal(
  eligibility: EligibilityCriteria,
  clientInfo: ClientInformation,
  projectInfo: ProjectInformation,
  agentId: string
): Promise<ProposalCreationResult> {
  try {
    // Create a contextualized logger
    const proposalLogger = logger.withContext({
      component: 'ProposalService',
      method: 'createProposal',
      agentId
    });
    
    // Validate agent ID is available
    if (!agentId) {
      proposalLogger.error("Missing agent ID when creating proposal");
      return {
        success: false,
        error: "Authentication error: User ID is missing. Please sign out and back in."
      };
    }

    // Validate client information is present
    if (!clientInfo.email || !clientInfo.name) {
      proposalLogger.error("Missing required client information", { clientInfo });
      return {
        success: false,
        error: "Client information is incomplete. Email and name are required."
      };
    }

    // Calculate derived values from project info
    const annualEnergy = calculateAnnualEnergy(projectInfo.size);
    const carbonCredits = calculateCarbonCredits(annualEnergy);
    const clientSharePercentage = 80; // Default percentage
    const agentCommissionPercentage = 5; // Default percentage
    
    // Generate proposal title
    const proposalTitle = `${projectInfo.name} - ${clientInfo.name}`;
    
    proposalLogger.info("Creating proposal", {
      title: proposalTitle,
      clientEmail: clientInfo.email,
      existingClient: clientInfo.existingClient,
      projectName: projectInfo.name
    });
    
    // Call the implementation with all required parameters
    return await createProposalImpl(
      proposalTitle,
      agentId,
      eligibility,
      projectInfo,
      clientInfo,
      annualEnergy,
      carbonCredits,
      clientSharePercentage,
      agentCommissionPercentage
    );
  } catch (error) {
    logger.error("Error in createProposal wrapper:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred"
    };
  }
}

// Helper function to calculate approximate annual energy from system size
function calculateAnnualEnergy(systemSize: string): number {
  const size = parseFloat(systemSize) || 0;
  // Simple estimation: 1 kW system produces roughly 1600 kWh per year in good conditions
  return size * 1600;
}

// Helper function to calculate approximate carbon credits
function calculateCarbonCredits(annualEnergy: number): number {
  // Simple estimation: 1 MWh of solar energy prevents roughly 0.7 tons of CO2
  return (annualEnergy / 1000) * 0.7;
}
