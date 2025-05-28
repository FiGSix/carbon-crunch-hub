
/**
 * Core calculation functions for carbon credits
 * Re-exports all functions from specialized modules for backward compatibility
 */

// Re-export normalization functions
export {
  normalizeToKWp,
  formatSystemSizeForDisplay
} from './normalization';

// Re-export energy calculation functions
export {
  calculateAnnualEnergy,
  calculateCarbonCredits,
  calculateCoalAvoided
} from './energy';

// Re-export revenue calculation functions
export {
  calculateRevenue
} from './revenue';

// Re-export pricing functions
export {
  getClientSharePercentage,
  getAgentCommissionPercentage
} from './pricing';

// Re-export results calculation functions
export {
  calculateResults
} from './results';
