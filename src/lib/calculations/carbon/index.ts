
/**
 * Carbon calculations - now uses only UnifiedCarbonService
 * All calculation logic has been consolidated into a single service
 */

// Import the unified service
import { UnifiedCarbonService } from '@/services/calculations/carbon';

// Export the main service
export { UnifiedCarbonService } from '@/services/calculations/carbon';

// Export types
export type { SystemSpecs, CarbonCalculationResult } from '@/services/calculations/carbon';

// Export simplified functions for backward compatibility
export { 
  normalizeToKWp,
  calculateAnnualEnergy,
  calculateCarbonCredits,
  getClientSharePercentage,
  getAgentCommissionPercentage,
  formatSystemSizeForDisplay,
  EMISSION_FACTOR,
  AVERAGE_SUN_HOURS,
  DAYS_IN_YEAR
} from './simplified';

// Simple revenue calculation for backward compatibility
export function calculateRevenue(carbonCredits: number, sharePercentage: number): number {
  const CARBON_PRICE = 25; // AUD per tonne - simplified fixed price
  return Math.round(carbonCredits * CARBON_PRICE * (sharePercentage / 100));
}

// Format number utility
export function formatNumber(num: number): string {
  return num.toLocaleString();
}

// Calculator-specific types and functions for backward compatibility
export interface YearData {
  year: number;
  generation: number;
  carbonOffset: number;
  carbonCredits: number;
}

export interface CalculationResults {
  annualGeneration: number;
  coalAvoided: number;
  carbonOffset: number;
  carbonCredits: number;
  yearsData: YearData[];
}

// Calculator results function - optimized version
export function calculateResults(
  systemSizeKwp: number, 
  commissionDate: Date, 
  unit: string = 'kWp'
): CalculationResults {
  // Use calculations from the consolidated carbon service
  const annualGeneration = UnifiedCarbonService.calculateAnnualEnergy(systemSizeKwp);
  const carbonCredits = UnifiedCarbonService.calculateCarbonCredits(systemSizeKwp);
  const carbonOffset = carbonCredits;
  const coalAvoided = annualGeneration * 0.85; // Approximate coal avoided in kg
  
  // Generate years data from commission date to 2030
  const startYear = commissionDate.getFullYear();
  const endYear = 2030;
  const yearsData: YearData[] = [];
  
  for (let year = startYear; year <= endYear; year++) {
    let yearlyGeneration = annualGeneration;
    let yearlyCredits = carbonCredits;
    
    // Pro-rate for commission year
    if (year === startYear) {
      const yearStart = new Date(year, 0, 1);
      const yearEnd = new Date(year, 11, 31);
      const remainingDays = Math.max(0, Math.floor((yearEnd.getTime() - commissionDate.getTime()) / (1000 * 60 * 60 * 24)) + 1);
      const totalDaysInYear = Math.floor((yearEnd.getTime() - yearStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      
      const proRateMultiplier = remainingDays / totalDaysInYear;
      yearlyGeneration = annualGeneration * proRateMultiplier;
      yearlyCredits = carbonCredits * proRateMultiplier;
    }
    
    yearsData.push({
      year,
      generation: yearlyGeneration,
      carbonOffset: yearlyCredits,
      carbonCredits: yearlyCredits
    });
  }
  
  return {
    annualGeneration,
    coalAvoided,
    carbonOffset,
    carbonCredits,
    yearsData
  };
}
