
// Main entry point for carbon calculations
export {
  calculateAnnualEnergy,
  calculateCarbonCredits,
  calculateCoalAvoided
} from './energy';

// Revenue calculation (now async)
export {
  calculateRevenue,
  calculateRevenueSync // deprecated
} from './revenue';

export {
  getClientSharePercentage,
  getAgentCommissionPercentage
} from './pricing';

export {
  calculateResults
} from './results';

export {
  normalizeToKWp,
  formatSystemSizeForDisplay
} from './normalization';

export {
  formatNumber,
  getCarbonPriceForYear,
  getFormattedCarbonPriceForYear,
  getCarbonPriceForYearSync, // deprecated
  getFormattedCarbonPriceForYearSync // deprecated
} from './utils';

export {
  getClientSpecificCarbonPrice,
  getFormattedClientSpecificCarbonPrice,
  calculateClientSpecificRevenue
} from './clientPricing';

export {
  dynamicCarbonPricingService
} from './dynamicPricing';

// System constants (now includes CARBON_PRICES as fallback)
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
