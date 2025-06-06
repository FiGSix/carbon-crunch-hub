
/**
 * Re-export all proposal transformation utilities from the refactored modules
 * This maintains backward compatibility while organizing code better
 */

// Main transformers
export { transformToProposalData, transformToProposalListItems } from './proposals/proposalTransformers';

// Data extractors
export { extractSystemSize, extractClientName } from './proposals/dataExtractors';

// Revenue calculators
export { calculateProposalRevenue, calculateAgentCommissionRevenue } from './proposals/revenueCalculators';

// Sorting utilities
export { applyClientSideSorting } from './proposals/proposalSorters';
