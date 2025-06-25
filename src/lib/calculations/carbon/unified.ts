
/**
 * Unified carbon calculations - consolidated from multiple fragmented files
 * This replaces the scattered calculation logic across multiple files
 */
import { UnifiedCarbonService } from '@/services/calculations/UnifiedCarbonService';

// Constants for backward compatibility
export const EMISSION_FACTOR = 0.928; // tCO₂/MWh
export const AVERAGE_SUN_HOURS = 4.5;
export const DAYS_IN_YEAR = 365;
export const DEFAULT_ANNUAL_GENERATION_FACTOR = 1200; // kWh per kWp per year

// Re-export the unified service functions directly
export const normalizeToKWp = UnifiedCarbonService.normalizeToKWp;
export const validateSystemSize = UnifiedCarbonService.validateSystemSize;
export const calculateAnnualEnergy = UnifiedCarbonService.calculateAnnualEnergy;
export const calculateCarbonCredits = UnifiedCarbonService.calculateCarbonCredits;
export const getClientSharePercentage = UnifiedCarbonService.getClientSharePercentage;
export const getAgentCommissionPercentage = UnifiedCarbonService.getAgentCommissionPercentage;
export const formatSystemSize = UnifiedCarbonService.formatSystemSize;
export const calculatePortfolioTotals = UnifiedCarbonService.calculatePortfolioTotals;
export const calculateComplete = UnifiedCarbonService.calculateComplete;

/**
 * @deprecated Use UnifiedCarbonService.formatSystemSize instead
 */
export function formatSystemSizeForDisplay(systemSizeKWp: number): string {
  return UnifiedCarbonService.formatSystemSize(systemSizeKWp);
}

/**
 * Simple revenue calculation with fixed carbon price
 * @deprecated Use UnifiedCarbonService.calculateComplete for dynamic pricing
 */
export function calculateRevenue(carbonCredits: number, sharePercentage: number): number {
  const CARBON_PRICE = 25; // AUD per tonne - simplified fixed price
  return Math.round(carbonCredits * CARBON_PRICE * (sharePercentage / 100));
}
