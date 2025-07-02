
/**
 * Core carbon calculation functions - consolidated from UnifiedCarbonService
 * This file provides direct access to core calculation functions for backward compatibility
 */
import { UnifiedCarbonService } from '@/services/calculations/carbon';

// Re-export core functions from UnifiedCarbonService
export const normalizeToKWp = UnifiedCarbonService.normalizeToKWp;
export const calculateAnnualEnergy = UnifiedCarbonService.calculateAnnualEnergy;
export const calculateCarbonCredits = UnifiedCarbonService.calculateCarbonCredits;
export const getClientSharePercentage = UnifiedCarbonService.getClientSharePercentage;
export const getAgentCommissionPercentage = UnifiedCarbonService.getAgentCommissionPercentage;
export const formatSystemSizeForDisplay = UnifiedCarbonService.formatSystemSize;

// Export types
export type { SystemSpecs, CarbonCalculationResult } from '@/services/calculations/carbon';

// Constants
export const EMISSION_FACTOR = 0.928; // tCO₂/MWh
export const AVERAGE_SUN_HOURS = 4.5;
export const DAYS_IN_YEAR = 365;
