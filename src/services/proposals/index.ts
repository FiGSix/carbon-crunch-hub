// Unified proposal service exports
export { createProposal, searchClients } from './unifiedProposalService';
export type { ProposalInsert } from './unifiedProposalService';

// Enterprise-grade reliable service
export { ReliableProposalService } from './ReliableProposalService';
export type { ReliableProposalResult, ProposalProgress } from './ReliableProposalService';

// Keep status update service
export { updateProposalStatus } from './statusUpdateService';
export type { StatusUpdateResult } from './statusUpdateService';
