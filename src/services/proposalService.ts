
import { 
  createProposal as createProposalImpl, 
  type ProposalCreationResult 
} from "./proposals/proposalCreationService";
import { EligibilityCriteria, ClientInformation, ProjectInformation } from "@/types/proposals";

// Simplified wrapper that provides a more user-friendly interface to the component
export async function createProposal(
  eligibility: EligibilityCriteria,
  clientInfo: ClientInformation,
  projectInfo: ProjectInformation
): Promise<ProposalCreationResult> {
  try {
    // Calculate derived values from project info
    const annualEnergy = calculateAnnualEnergy(projectInfo.size);
    const carbonCredits = calculateCarbonCredits(annualEnergy);
    const clientSharePercentage = 80; // Default percentage
    const agentCommissionPercentage = 5; // Default percentage
    
    // Generate proposal title
    const proposalTitle = `${projectInfo.name} - ${clientInfo.name}`;
    
    // Get current user ID from localStorage as fallback
    let agentId = '';
    try {
      const authData = localStorage.getItem('supabase.auth.token');
      if (authData) {
        const parsedAuth = JSON.parse(authData);
        agentId = parsedAuth?.currentSession?.user?.id || '';
      }
    } catch (error) {
      console.error("Failed to get agent ID from localStorage:", error);
    }
    
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
    console.error("Error in createProposal wrapper:", error);
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
