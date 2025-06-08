
import { supabase } from "@/integrations/supabase/client";
import { EligibilityCriteria, ClientInformation, ProjectInformation } from "@/types/proposals";
import { logger } from "@/lib/logger";
import { normalizeToKWp } from "@/lib/calculations/carbon/normalization";
import { calculateAnnualEnergy, calculateCarbonCredits } from "@/lib/calculations/carbon";
import { findOrCreateClient } from "./clientService";
import { 
  calculateClientSharePercentage, 
  calculateAgentCommissionPercentage,
  getClientPortfolioSize,
  getAgentPortfolioSize
} from "./portfolioCalculations";
import type { Database } from "@/integrations/supabase/types";

type ProposalInsert = Database['public']['Tables']['proposals']['Insert'];

/**
 * Simplified proposal creation - everything in one function
 */
export async function createSimpleProposal(
  proposalTitle: string,
  agentId: string,
  eligibilityCriteria: EligibilityCriteria,
  projectInfo: ProjectInformation,
  clientInfo: ClientInformation,
  selectedClientId?: string
): Promise<{ success: boolean; proposalId?: string; error?: string }> {
  const proposalLogger = logger.withContext({
    component: 'SimpleProposalService',
    method: 'createSimpleProposal'
  });

  try {
    proposalLogger.info("Creating proposal with simplified service", { 
      proposalTitle, 
      agentId, 
      selectedClientId,
      projectSize: projectInfo.size,
      clientEmail: clientInfo.email
    });

    // Step 1: Handle client (find existing or create new)
    const clientId = selectedClientId || await findOrCreateClient(clientInfo, agentId);
    
    // Step 2: Calculate system size and carbon values
    const systemSizeKWp = normalizeToKWp(projectInfo.size) || 0;
    const annualEnergy = calculateAnnualEnergy(systemSizeKWp);
    const carbonCredits = calculateCarbonCredits(systemSizeKWp);
    
    // Step 3: Calculate portfolio-based percentages
    const [clientPortfolioKWp, agentPortfolioKWp] = await Promise.all([
      getClientPortfolioSize(clientId),
      getAgentPortfolioSize(agentId)
    ]);
    
    const totalClientPortfolio = clientPortfolioKWp + systemSizeKWp;
    const totalAgentPortfolio = agentPortfolioKWp + systemSizeKWp;
    
    const clientSharePercentage = calculateClientSharePercentage(totalClientPortfolio);
    const agentCommissionPercentage = calculateAgentCommissionPercentage(totalAgentPortfolio);
    
    // Step 4: Insert proposal with explicit typing
    const proposalData: ProposalInsert = {
      title: proposalTitle,
      agent_id: agentId,
      client_reference_id: clientId,
      status: 'pending',
      content: {
        title: proposalTitle,
        eligibilityCriteria,
        projectInfo,
        clientInfo
      },
      eligibility_criteria: eligibilityCriteria,
      project_info: projectInfo,
      system_size_kwp: systemSizeKWp,
      annual_energy: annualEnergy,
      carbon_credits: carbonCredits,
      client_share_percentage: clientSharePercentage,
      agent_commission_percentage: agentCommissionPercentage,
      agent_portfolio_kwp: totalAgentPortfolio
    };

    const { data: insertedProposal, error: insertError } = await supabase
      .from('proposals')
      .insert(proposalData)
      .select('id')
      .single();

    if (insertError) {
      proposalLogger.error("Failed to insert proposal", { error: insertError });
      throw insertError;
    }

    proposalLogger.info("Proposal created successfully", { 
      proposalId: insertedProposal.id,
      clientId,
      systemSizeKWp,
      annualEnergy,
      carbonCredits,
      clientSharePercentage,
      agentCommissionPercentage
    });

    return {
      success: true,
      proposalId: insertedProposal.id
    };

  } catch (error) {
    proposalLogger.error("Proposal creation failed", { error });
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create proposal"
    };
  }
}
