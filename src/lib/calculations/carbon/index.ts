
// Main entry point for carbon calculations
export {
  calculateAnnualEnergy,
  calculateCarbonCredits,
  calculateCoalAvoided,
  calculateRevenue,
  getClientSharePercentage,
  getAgentCommissionPercentage,
  calculateResults,
  normalizeToKWp,
  formatSystemSizeForDisplay
} from './core';

export {
  formatNumber,
  getCarbonPriceForYear,
  getFormattedCarbonPriceForYear
} from './utils';

export {
  EMISSION_FACTOR,
  COAL_FACTOR,
  AVERAGE_SUN_HOURS,
  DAYS_IN_YEAR,
  CARBON_PRICES
} from './constants';

export type {
  YearData,
  CalculationResults
} from './types';
