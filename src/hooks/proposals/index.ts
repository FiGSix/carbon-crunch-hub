
/**
 * Re-export proposal hooks for cleaner imports
 * This provides a centralized import point for all proposal-related hooks
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

// Utilities
export { useFetchProposals } from './useFetchProposals';
export { useAuthRefresh } from './useAuthRefresh';
