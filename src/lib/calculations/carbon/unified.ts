
/**
 * Unified carbon calculations - consolidated from multiple fragmented files
 * This replaces the scattered calculation logic across multiple files
 */
import { UnifiedCarbonService } from '@/services/calculations/UnifiedCarbonService';

// Re-export the unified service functions for backward compatibility
export const {
  normalizeToKWp,
  validateSystemSize,
  calculateAnnualEnergy,
  calculateCarbonCredits,
  getClientSharePercentage,
  getAgentCommissionPercentage,
  formatSystemSize,
  calculatePortfolioTotals,
  calculateComplete
} = UnifiedCarbonService;

// Constants for backward compatibility
export const EMISSION_FACTOR = 0.928; // tCO₂/MWh
export const AVERAGE_SUN_HOURS = 4.5;
export const DAYS_IN_YEAR = 365;
export const DEFAULT_ANNUAL_GENERATION_FACTOR = 1200; // kWh per kWp per year

/**
 * @deprecated Use UnifiedCarbonService.normalizeToKWp instead
 */
export function normalizeToKWp(systemSize: string | number, unit?: string): number {
  return UnifiedCarbonService.normalizeToKWp(systemSize, unit);
}

/**
 * @deprecated Use UnifiedCarbonService.formatSystemSize instead
 */
export function formatSystemSizeForDisplay(systemSizeKWp: number): string {
  return UnifiedCarbonService.formatSystemSize(systemSizeKWp);
}

/**
 * @deprecated Use UnifiedCarbonService.calculateAnnualEnergy instead
 */
export function calculateAnnualEnergy(systemSizeKWp: number): number {
  return UnifiedCarbonService.calculateAnnualEnergy(systemSizeKWp);
}

/**
 * @deprecated Use UnifiedCarbonService.calculateCarbonCredits instead
 */
export function calculateCarbonCredits(systemSizeKWp: number, unit?: string): number {
  const normalizedSize = typeof systemSizeKWp === 'string' 
    ? UnifiedCarbonService.normalizeToKWp(systemSizeKWp, unit) 
    : systemSizeKWp;
  return UnifiedCarbonService.calculateCarbonCredits(normalizedSize);
}

/**
 * Simple revenue calculation with fixed carbon price
 * @deprecated Use UnifiedCarbonService.calculateComplete for dynamic pricing
 */
export function calculateRevenue(carbonCredits: number, sharePercentage: number): number {
  const CARBON_PRICE = 25; // AUD per tonne - simplified fixed price
  return Math.round(carbonCredits * CARBON_PRICE * (sharePercentage / 100));
}

/**
 * @deprecated Use UnifiedCarbonService.getClientSharePercentage instead
 */
export function getClientSharePercentage(portfolioKWp: number): number {
  return UnifiedCarbonService.getClientSharePercentage(portfolioKWp);
}

/**
 * @deprecated Use UnifiedCarbonService.getAgentCommissionPercentage instead
 */
export function getAgentCommissionPercentage(portfolioKWp: number): number {
  return UnifiedCarbonService.getAgentCommissionPercentage(portfolioKWp);
}
