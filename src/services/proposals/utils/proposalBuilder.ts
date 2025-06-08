
import { supabase } from "@/integrations/supabase/client";
import { EligibilityCriteria, ClientInformation, ProjectInformation } from "@/types/proposals";
import { 
  getClientSharePercentage,
  getAgentCommissionPercentage,
  calculateAnnualEnergy,
  calculateCarbonCredits
} from "@/lib/calculations/carbon";
import { formatSystemSizeForDisplay, normalizeToKWp } from "@/lib/calculations/carbon/normalization";
import { logger } from "@/lib/logger";
import { calculateClientPortfolio } from "../portfolioCalculationService";
import { calculateAgentPortfolio } from "../agentPortfolioService";

// Define types for proposal creation
interface ProposalContent {
  eligibilityCriteria: EligibilityCriteria;
  projectInfo: ProjectInformation;
  clientInfo: ClientInformation;
  calculationMetadata: {
    portfolioBasedPricing: boolean;
    agentPortfolioSize: number;
    clientPortfolioSize: number;
    calculatedAt: string;
  };
  portfolioSize: number;
}

// Enhanced client data interface - now matches ClientResult
interface ClientData {
  clientId: string; // ID from clients table
  profileId?: string; // ID from profiles table (for registered users)
  isRegisteredUser: boolean;
}

export async function buildProposalData(
  title: string,
  agentId: string,
  eligibilityCriteria: EligibilityCriteria,
  projectInfo: ProjectInformation,
  clientInfo: ClientInformation,
  selectedClientId?: string,
  clientData?: ClientData
): Promise<any> {
  const proposalLogger = logger.withContext({
    component: 'ProposalBuilder',
    method: 'buildProposalData'
  });

  try {
    proposalLogger.info("Building proposal data with portfolio-aware calculations", {
      agentId,
      selectedClientId,
      projectSize: projectInfo.size,
      clientData
    });

    // Calculate current agent portfolio size (excluding this proposal)
    const agentPortfolio = await calculateAgentPortfolio(agentId);
    const currentAgentPortfolioKWp = agentPortfolio.totalKWp;
    
    // Add current project to agent portfolio for commission calculation
    const projectSizeKWp = normalizeToKWp(projectInfo.size) || 0;
    const agentPortfolioWithNewProject = currentAgentPortfolioKWp + projectSizeKWp;
    
    proposalLogger.info("Agent portfolio calculation", {
      currentPortfolioKWp: currentAgentPortfolioKWp,
      newProjectKWp: projectSizeKWp,
      totalPortfolioKWp: agentPortfolioWithNewProject
    });

    // Calculate agent commission based on portfolio including this new project
    const agentCommissionPercentage = getAgentCommissionPercentage(agentPortfolioWithNewProject);

    // Calculate client portfolio and share percentage
    let clientSharePercentage = 63; // Default for new clients
    let clientPortfolioKWp = projectSizeKWp;
    
    // Determine which client ID to use for portfolio calculations
    const clientIdForPortfolio = clientData?.clientId || selectedClientId;
    
    if (clientIdForPortfolio) {
      try {
        const clientPortfolio = await calculateClientPortfolio(clientIdForPortfolio);
        clientPortfolioKWp = clientPortfolio.totalKWp + projectSizeKWp;
        clientSharePercentage = getClientSharePercentage(clientPortfolioKWp);
        
        proposalLogger.info("Client portfolio calculation", {
          clientId: clientIdForPortfolio,
          existingPortfolioKWp: clientPortfolio.totalKWp,
          newProjectKWp: projectSizeKWp,
          totalPortfolioKWp: clientPortfolioKWp,
          clientSharePercentage
        });
      } catch (error) {
        proposalLogger.warn("Could not calculate client portfolio, using default share", { error });
      }
    }

    // Calculate carbon values using the new methods
    let annualEnergy: number | null = null;
    let carbonCredits: number | null = null;
    
    try {
      if (projectSizeKWp > 0) {
        annualEnergy = calculateAnnualEnergy(projectSizeKWp);
        carbonCredits = calculateCarbonCredits(projectSizeKWp);
        
        proposalLogger.info("Carbon calculations completed", {
          projectSizeKWp,
          annualEnergy,
          carbonCredits
        });
      }
    } catch (carbonError) {
      proposalLogger.error("Failed to calculate carbon values", { 
        error: carbonError,
        projectSizeKWp 
      });
    }

    // Build proposal content with portfolio metadata
    const proposalContent = {
      eligibilityCriteria,
      projectInfo,
      clientInfo,
      calculationMetadata: {
        portfolioBasedPricing: true,
        agentPortfolioSize: agentPortfolioWithNewProject,
        clientPortfolioSize: clientPortfolioKWp,
        calculatedAt: new Date().toISOString()
      },
      portfolioSize: clientPortfolioKWp
    };

    // Properly handle client IDs to avoid foreign key constraint violations
    const proposalData = {
      title,
      agent_id: agentId,
      // client_id should ONLY reference profiles table (registered users)
      client_id: clientData?.isRegisteredUser ? clientData.profileId : null,
      // client_reference_id should ALWAYS point to clients table
      client_reference_id: clientData?.clientId || selectedClientId,
      content: proposalContent,
      system_size_kwp: projectSizeKWp,
      annual_energy: annualEnergy,
      carbon_credits: carbonCredits,
      client_share_percentage: clientSharePercentage,
      agent_commission_percentage: agentCommissionPercentage,
      agent_portfolio_kwp: agentPortfolioWithNewProject,
      status: 'pending',
      created_at: new Date().toISOString()
    };

    proposalLogger.info("Proposal data built successfully", {
      clientId: proposalData.client_id,
      clientReferenceId: proposalData.client_reference_id,
      isRegisteredUser: clientData?.isRegisteredUser,
      systemSizeKwp: proposalData.system_size_kwp,
      annualEnergy: proposalData.annual_energy,
      carbonCredits: proposalData.carbon_credits
    });

    return proposalData;

  } catch (error) {
    proposalLogger.error("Error building proposal data", { error });
    throw error;
  }
}
