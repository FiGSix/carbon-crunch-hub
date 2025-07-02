/**
 * Simplified carbon calculation functions for backward compatibility
 * These are now wrappers around the consolidated carbon calculation system
 */
import { UnifiedCarbonService } from '@/services/calculations/carbon';

// Re-export core functions from the consolidated system
export const normalizeToKWp = UnifiedCarbonService.normalizeToKWp;
export const calculateAnnualEnergy = UnifiedCarbonService.calculateAnnualEnergy;
export const calculateCarbonCredits = UnifiedCarbonService.calculateCarbonCredits;
export const getClientSharePercentage = UnifiedCarbonService.getClientSharePercentage;
export const getAgentCommissionPercentage = UnifiedCarbonService.getAgentCommissionPercentage;

// Constants
export const EMISSION_FACTOR = 1.0334; // tCO₂/MWh (Crunch Carbon's unique grid emission factor)
export const AVERAGE_SUN_HOURS = 4.5;
export const DAYS_IN_YEAR = 365;

// Format system size for display
export function formatSystemSizeForDisplay(sizeKwp: number): string {
  return UnifiedCarbonService.formatSystemSize(sizeKwp);
}