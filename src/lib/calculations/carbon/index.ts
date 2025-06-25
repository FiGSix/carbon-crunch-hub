
/**
 * Carbon calculations - now uses only UnifiedCarbonService
 * All calculation logic has been consolidated into a single service
 */

// Export the main service
export { UnifiedCarbonService } from '@/services/calculations/UnifiedCarbonService';

// Export types
export type { SystemSpecs, CarbonCalculationResult } from '@/services/calculations/UnifiedCarbonService';

// Re-export convenience functions for backward compatibility
export const {
  normalizeToKWp,
  calculateAnnualEnergy,
  calculateCarbonCredits,
  formatSystemSize,
  validateSystemSize,
  calculateComplete,
  calculatePortfolioTotals,
  getClientSharePercentage,
  getAgentCommissionPercentage
} = UnifiedCarbonService;

// Constants for backward compatibility
export const EMISSION_FACTOR = 0.928; // tCO₂/MWh
export const AVERAGE_SUN_HOURS = 4.5;
export const DAYS_IN_YEAR = 365;

// Simple revenue calculation for backward compatibility
export function calculateRevenue(carbonCredits: number, sharePercentage: number): number {
  const CARBON_PRICE = 25; // AUD per tonne - simplified fixed price
  return Math.round(carbonCredits * CARBON_PRICE * (sharePercentage / 100));
}

// Format number utility
export function formatNumber(num: number): string {
  return num.toLocaleString();
}
