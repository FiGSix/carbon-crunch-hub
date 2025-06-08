
// Barrel file for proposalService to maintain backward compatibility
export { createProposal } from './proposalCreationService';
export type { ProposalCreationResult } from './proposalCreationService';
export { findOrCreateClient } from './simple/clientService';

// Export the new status update service
export { updateProposalStatus } from './statusUpdateService';
export type { StatusUpdateResult } from './statusUpdateService';

// Export the simplified proposal creation service
export { createSimpleProposal } from './simple/proposalCreation';
