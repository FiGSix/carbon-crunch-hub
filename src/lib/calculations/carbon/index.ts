// Simplified carbon calculations entry point
export {
  normalizeToKWp,
  calculateAnnualEnergy,
  calculateCarbonCredits,
  calculateRevenue,
  getClientSharePercentage,
  getAgentCommissionPercentage,
  EMISSION_FACTOR,
  AVERAGE_SUN_HOURS,
  DAYS_IN_YEAR
} from './simplified';

// Export types
export type { CalculationResults, YearData } from './types';

// Export additional functions needed by other modules
export { calculateResults } from './results';
export { formatSystemSizeForDisplay } from './core';

// Export utility function
export function formatNumber(num: number): string {
  return num.toLocaleString();
}

// Keep legacy exports for backward compatibility
export { normalizeToKWp as formatSystemSizeForDisplay } from './simplified';
