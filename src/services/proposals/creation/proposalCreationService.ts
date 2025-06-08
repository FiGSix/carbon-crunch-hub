import { EligibilityCriteria, ClientInformation, ProjectInformation } from "@/types/proposals";
import { logger } from "@/lib/logger";
import { createSimpleProposal } from "../simpleProposalService";

// Keep the same interface for backward compatibility but use simplified implementation
export async function createProposal(
  title: string,
  agentId: string,
  eligibilityCriteria: EligibilityCriteria,
  projectInfo: ProjectInformation,
  clientInfo: ClientInformation,
  selectedClientId?: string
) {
  const proposalLogger = logger.withContext({
    component: 'ProposalCreationService',
    method: 'createProposal'
  });

  proposalLogger.info("Using simplified proposal creation", { 
    title, 
    agentId, 
    selectedClientId 
  });

  // Use the simplified service
  const result = await createSimpleProposal(
    title,
    agentId,
    eligibilityCriteria,
    projectInfo,
    clientInfo,
    selectedClientId
  );

  if (result.success) {
    // Transform to match expected interface
    return {
      success: true,
      data: {
        id: result.proposalId,
        title,
        agent_id: agentId,
        eligibility_criteria: eligibilityCriteria,
        project_info: projectInfo,
        client_info: clientInfo,
        status: 'pending'
      }
    };
  } else {
    return {
      success: false,
      error: result.error
    };
  }
}
