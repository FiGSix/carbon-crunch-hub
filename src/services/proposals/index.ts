// Barrel file for proposalService to maintain backward compatibility
export { createProposal, type ProposalCreationResult } from './proposalCreationService';
export { findOrCreateClient } from './clientProfileService';
export type { ProposalData } from './types';

// Export the new status update service
export { updateProposalStatus } from './statusUpdateService';
export type { StatusUpdateResult } from './statusUpdateService';
