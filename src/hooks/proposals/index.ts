
/**
 * Centralized import point for all proposal-related hooks - Simplified
 */

// Main query hooks
export { useProposals } from '../useProposals';
export { useProposalFilters } from './useProposalFilters';

// View hooks  
export { useViewProposal } from './view/useViewProposal';
export { useProposalStatus } from './view/useProposalStatus';
export { useProposalActions } from './view/useProposalActions';
export { useProposalData } from './view/useProposalData';

// Operations
export { useProposalOperations } from './useProposalOperations';

// Portfolio management - simplified
export { usePortfolioUpdates } from './usePortfolioUpdates';

// Utilities
export { useFetchProposals } from './useFetchProposals';
export { useAuthRefresh } from './useAuthRefresh';
