
/**
 * Carbon Calculations Module
 * 
 * This module centralizes all carbon-related calculations and constants
 * to ensure consistency across the application.
 */

// Export all types
export type { YearData, CalculationResults } from './types';

// Export constants
export { 
  EMISSION_FACTOR,
  COAL_FACTOR,
  AVERAGE_SUN_HOURS,
  DAYS_IN_YEAR,
  CARBON_PRICES
} from './constants';

// Export utility functions
export {
  formatNumber,
  getCarbonPriceForYear,
  getFormattedCarbonPriceForYear
} from './utils';

// Export core calculation functions
export {
  calculateAnnualEnergy,
  calculateCarbonCredits,
  calculateCoalAvoided,
  calculateRevenue,
  getClientSharePercentage,
  getAgentCommissionPercentage,
  calculateResults
} from './core';
