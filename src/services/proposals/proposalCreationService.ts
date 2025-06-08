
// Main proposal creation service that uses the simplified approach
export { createSimpleProposal as createProposal } from './simple/proposalCreation';
export type { EligibilityCriteria, ClientInformation, ProjectInformation } from '@/types/proposals';

// For backward compatibility
export interface ProposalCreationResult {
  success: boolean;
  proposalId?: string;
  error?: string;
  data?: any;
}
