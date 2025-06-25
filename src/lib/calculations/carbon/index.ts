
// Unified carbon calculations entry point
// Now uses the consolidated UnifiedCarbonService

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
} from './unified';

// Export the main service
export { UnifiedCarbonService } from '@/services/calculations/UnifiedCarbonService';

// Export types
export type { SystemSpecs, CarbonCalculationResult } from '@/services/calculations/UnifiedCarbonService';
export type { CalculationResults, YearData } from './types';

// Export additional functions needed by other modules
export { calculateResults } from './results';

// Export utility function
export function formatNumber(num: number): string {
  return num.toLocaleString();
}
