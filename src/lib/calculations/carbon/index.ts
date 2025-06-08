
// Simplified carbon calculations entry point
export {
  normalizeToKWp,
  calculateAnnualEnergy,
  calculateCarbonCredits,
  calculateRevenue,
  getClientSharePercentage,
  getAgentCommissionPercentage,
  formatSystemSizeForDisplay,
  EMISSION_FACTOR,
  AVERAGE_SUN_HOURS,
  DAYS_IN_YEAR
} from './simplified';

// Export types
export type { CalculationResults, YearData } from './types';

// Export additional functions needed by other modules
export { calculateResults } from './results';

// Export utility function
export function formatNumber(num: number): string {
  return num.toLocaleString();
}
