/**
 * Unified Carbon Calculation Service - Refactored into smaller modules
 * This file maintains backward compatibility with the original UnifiedCarbonService
 */

// Export types
export type { SystemSpecs, CarbonCalculationResult, ValidationResult, PortfolioTotals } from './types';

// Export constants
export { 
  DEFAULT_ANNUAL_GENERATION_FACTOR,
  DEFAULT_CARBON_FACTOR,
  DEFAULT_CLIENT_SHARE,
  AGENT_COMMISSION_LOW,
  AGENT_COMMISSION_HIGH
} from './constants';

// Export validation functions
export { normalizeToKWp, validateSystemSize } from './validation';

// Export calculation functions
export { calculateAnnualEnergy, calculateCarbonCredits } from './calculations';

// Export pricing functions
export {
  getClientSharePercentage,
  getAgentCommissionPercentage,
  getCrunchCommissionPercentage,
  calculateRevenueByYear,
  calculateRevenueByYearSync
} from './pricing';

// Export formatting functions
export { formatSystemSize } from './formatting';

// Export portfolio functions
export { calculatePortfolioTotals } from './portfolio';

// Export core calculation function
export { calculateComplete } from './core';

/**
 * Unified Carbon Calculation Service
 * Single source of truth for all carbon-related calculations
 * Now implemented as static methods that delegate to the modular functions
 */
export class UnifiedCarbonService {
  // Re-export constants as static properties for backward compatibility
  static readonly DEFAULT_ANNUAL_GENERATION_FACTOR = 1642.50;
  static readonly DEFAULT_CARBON_FACTOR = 1.0334;
  static readonly DEFAULT_CLIENT_SHARE = 75;
  static readonly AGENT_COMMISSION_LOW = 4;
  static readonly AGENT_COMMISSION_HIGH = 7;

  // Import and re-export all functions as static methods
  static normalizeToKWp = normalizeToKWp;
  static validateSystemSize = validateSystemSize;
  static calculateAnnualEnergy = calculateAnnualEnergy;
  static calculateCarbonCredits = calculateCarbonCredits;
  static getClientSharePercentage = getClientSharePercentage;
  static getAgentCommissionPercentage = getAgentCommissionPercentage;
  static getCrunchCommissionPercentage = getCrunchCommissionPercentage;
  static calculateRevenueByYear = calculateRevenueByYear;
  static calculateRevenueByYearSync = calculateRevenueByYearSync;
  static formatSystemSize = formatSystemSize;
  static calculatePortfolioTotals = calculatePortfolioTotals;
  static calculateComplete = calculateComplete;
}

// Import individual functions
import { normalizeToKWp, validateSystemSize } from './validation';
import { calculateAnnualEnergy, calculateCarbonCredits } from './calculations';
import { 
  getClientSharePercentage, 
  getAgentCommissionPercentage, 
  getCrunchCommissionPercentage, 
  calculateRevenueByYear,
  calculateRevenueByYearSync
} from './pricing';
import { formatSystemSize } from './formatting';
import { calculatePortfolioTotals } from './portfolio';
import { calculateComplete } from './core';