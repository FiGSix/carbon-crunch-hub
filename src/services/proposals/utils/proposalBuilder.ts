import { supabase } from "@/integrations/supabase/client";
import { EligibilityCriteria, ClientInformation, ProjectInformation } from "@/types/proposals";
import { 
  getClientSharePercentage,
  getAgentCommissionPercentage
} from "@/lib/calculations/carbon";
import { formatSystemSizeForDisplay } from "@/lib/calculations/carbon/normalization";
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

export async function buildProposalData(
  title: string,
  agentId: string,
  eligibilityCriteria: EligibilityCriteria,
  projectInfo: ProjectInformation,
  clientInfo: ClientInformation,
  selectedClientId?: string,
  clientData?: any
): Promise<any> {
  const proposalLogger = logger.withContext({
    component: 'ProposalBuilder',
    method: 'buildProposalData'
  });

  try {
    proposalLogger.info("Building proposal data with portfolio-aware calculations", {
      agentId,
      selectedClientId,
      projectSize: projectInfo.size
    });

    // Calculate current agent portfolio size (excluding this proposal)
    const agentPortfolio = await calculateAgentPortfolio(agentId);
    const currentAgentPortfolioKWp = agentPortfolio.totalKWp;
    
    // Add current project to agent portfolio for commission calculation
    const projectSizeKWp = parseFloat(projectInfo.size) || 0;
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
    
    if (selectedClientId) {
      try {
        const clientPortfolio = await calculateClientPortfolio(selectedClientId);
        clientPortfolioKWp = clientPortfolio.totalKWp + projectSizeKWp;
        clientSharePercentage = getClientSharePercentage(clientPortfolioKWp);
        
        proposalLogger.info("Client portfolio calculation", {
          clientId: selectedClientId,
          existingPortfolioKWp: clientPortfolio.totalKWp,
          newProjectKWp: projectSizeKWp,
          totalPortfolioKWp: clientPortfolioKWp,
          clientSharePercentage
        });
      } catch (error) {
        proposalLogger.warn("Could not calculate client portfolio, using default share", { error });
      }
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

    // Determine client reference
    const clientReferenceId = selectedClientId || clientData?.clientId;

    return {
      title,
      agent_id: agentId,
      client_id: clientData?.clientId,
      client_reference_id: clientReferenceId,
      content: proposalContent,
      system_size_kwp: projectSizeKWp,
      client_share_percentage: clientSharePercentage,
      agent_commission_percentage: agentCommissionPercentage,
      agent_portfolio_kwp: agentPortfolioWithNewProject, // Store agent portfolio size at creation
      status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

  } catch (error) {
    proposalLogger.error("Error building proposal data", { error });
    throw error;
  }
}
