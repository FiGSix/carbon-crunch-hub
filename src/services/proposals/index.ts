
// Barrel file for proposalService to maintain backward compatibility
export { createProposal } from './creation/proposalCreationService';
export type { ProposalCreationResult, ProposalData } from './creation/types';
export { findOrCreateClient } from './clientProfileService';

// Export the new status update service
export { updateProposalStatus } from './statusUpdateService';
export type { StatusUpdateResult } from './statusUpdateService';
