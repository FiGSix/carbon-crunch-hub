
/**
 * Complete calculation results functions
 */
import { EMISSION_FACTOR, AVERAGE_SUN_HOURS, DAYS_IN_YEAR } from './constants';
import { normalizeToKWp } from './normalization';
import type { YearData, CalculationResults } from './types';

/**
 * Get current year for filtering past years
 */
function getCurrentYear(): number {
  return new Date().getFullYear();
}

/**
 * Calculate results for a solar system based on size and commissioning date
 * 
 * @param systemSize - System size (will be normalized to kWp)
 * @param commissioningDate - Date when system is commissioned
 * @param unit - Optional unit specification
 */
export function calculateResults(systemSize: number, commissioningDate: Date, unit?: string): CalculationResults {
  const sizeInKWp = normalizeToKWp(systemSize, unit);
  const dailyGeneration = sizeInKWp * AVERAGE_SUN_HOURS; // kWh per day
  const yearStart = new Date(commissioningDate.getFullYear(), 0, 1);
  const yearEnd = new Date(commissioningDate.getFullYear(), 11, 31);
  
  // Calculate days in the first year (for prorated calculation)
  const daysInFirstYear = Math.max(1, Math.floor((yearEnd.getTime() - commissioningDate.getTime()) / (1000 * 60 * 60 * 24)) + 1);
  
  // Calculate first year's generation (prorated)
  const firstYearGeneration = dailyGeneration * daysInFirstYear;
  
  // Calculate full year generation
  const fullYearGeneration = dailyGeneration * DAYS_IN_YEAR;
  
  // Calculate yearly data from commissioning to 2030 (but only for current and future years)
  const yearsData: YearData[] = [];
  const startYear = Math.max(commissioningDate.getFullYear(), getCurrentYear());
  const endYear = 2030;
  
  for (let year = startYear; year <= endYear; year++) {
    const isFirstYear = year === commissioningDate.getFullYear();
    const yearGeneration = isFirstYear ? firstYearGeneration : fullYearGeneration;
    const yearCarbonOffset = (yearGeneration * EMISSION_FACTOR) / 1000; // Convert kg to tonnes
    const yearCarbonCredits = Math.floor(yearCarbonOffset); // 1 credit = 1 tonne
    
    yearsData.push({
      year,
      generation: yearGeneration,
      carbonOffset: yearCarbonOffset,
      carbonCredits: yearCarbonCredits
    });
  }
  
  // Coal calculation
  const totalCoalAvoided = fullYearGeneration * 0.0011; // Using COAL_FACTOR inline since it's imported in energy.ts
  
  return {
    annualGeneration: fullYearGeneration,
    coalAvoided: totalCoalAvoided,
    carbonOffset: (fullYearGeneration * EMISSION_FACTOR) / 1000, // Convert kg to tonnes
    carbonCredits: Math.floor((fullYearGeneration * EMISSION_FACTOR) / 1000), // 1 credit = 1 tonne
    yearsData
  };
}
