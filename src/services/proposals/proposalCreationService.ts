
import { createSimpleProposal } from './simple/proposalCreation';

export interface ProposalCreationResult {
  success: boolean;
  proposalId?: string;
  error?: string;
}

/**
 * Legacy proposal creation service - now delegates to simplified service
 */
export async function createProposal(
  proposalTitle: string,
  agentId: string,
  eligibilityCriteria: any,
  projectInfo: any,
  clientInfo: any,
  selectedClientId?: string
): Promise<ProposalCreationResult> {
  return createSimpleProposal(
    proposalTitle,
    agentId,
    eligibilityCriteria,
    projectInfo,
    clientInfo,
    selectedClientId
  );
}
