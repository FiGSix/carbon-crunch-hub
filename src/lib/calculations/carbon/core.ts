
/**
 * Core calculation functions for carbon credits
 */
import { 
  EMISSION_FACTOR, 
  COAL_FACTOR, 
  AVERAGE_SUN_HOURS, 
  DAYS_IN_YEAR,
  CARBON_PRICES 
} from './constants';
import type { YearData, CalculationResults } from './types';

/**
 * Normalize system size to kWp regardless of input unit
 * 
 * @param systemSize - Solar system size (string or number)
 * @param unit - Unit type ('kWp', 'MWp', or auto-detect from string)
 */
export function normalizeToKWp(systemSize: string | number, unit?: string): number {
  if (typeof systemSize === 'string') {
    // Try to extract unit from string if not provided
    const sizeStr = systemSize.toLowerCase().trim();
    const numericValue = parseFloat(sizeStr);
    
    if (isNaN(numericValue)) return 0;
    
    // Auto-detect unit from string
    if (sizeStr.includes('mwp') || sizeStr.includes('mw')) {
      return numericValue * 1000; // Convert MWp to kWp
    } else {
      return numericValue; // Assume kWp
    }
  }
  
  const sizeValue = typeof systemSize === 'number' ? systemSize : parseFloat(systemSize);
  if (isNaN(sizeValue)) return 0;
  
  // Apply unit conversion if specified
  if (unit) {
    switch (unit.toLowerCase()) {
      case 'mwp':
      case 'mw':
        return sizeValue * 1000;
      default:
        return sizeValue;
    }
  }
  
  return sizeValue;
}

/**
 * Format system size for display with appropriate unit
 * 
 * @param sizeInKWp - System size in kWp
 * @param preferredUnit - Preferred display unit ('auto', 'kWp', 'MWp')
 */
export function formatSystemSizeForDisplay(sizeInKWp: number, preferredUnit: string = 'auto'): string {
  if (isNaN(sizeInKWp) || sizeInKWp <= 0) return '0 kWp';
  
  switch (preferredUnit.toLowerCase()) {
    case 'kwp':
    case 'kw':
      return `${sizeInKWp.toLocaleString()} kWp`;
    case 'mwp':
    case 'mw':
      return `${(sizeInKWp / 1000).toFixed(3)} MWp`;
    case 'auto':
    default:
      if (sizeInKWp >= 1000) {
        return `${(sizeInKWp / 1000).toFixed(3)} MWp`;
      } else {
        return `${sizeInKWp.toLocaleString()} kWp`;
      }
  }
}

/**
 * Calculate the annual energy production in kWh based on system size in kWp
 * 
 * @param systemSize - Solar system size (will be normalized to kWp)
 * @param unit - Optional unit specification
 */
export function calculateAnnualEnergy(systemSize: string | number, unit?: string): number {
  const sizeInKWp = normalizeToKWp(systemSize, unit);
  
  // Calculate daily and annual energy
  const dailyKWh = sizeInKWp * AVERAGE_SUN_HOURS;
  return dailyKWh * DAYS_IN_YEAR; // Annual energy in kWh
}

/**
 * Calculate the carbon credits based on annual energy production
 * 
 * @param systemSize - Solar system size (will be normalized to kWp)
 * @param unit - Optional unit specification
 */
export function calculateCarbonCredits(systemSize: string | number, unit?: string): number {
  const annualEnergy = calculateAnnualEnergy(systemSize, unit);
  // Convert kWh to MWh and then to tCO2 using the emission factor
  return (annualEnergy / 1000) * EMISSION_FACTOR;
}

/**
 * Calculate coal avoided based on energy production
 * 
 * @param energyInKWh - Energy production in kWh
 */
export function calculateCoalAvoided(energyInKWh: number): number {
  return energyInKWh * COAL_FACTOR;
}

/**
 * Calculate projected revenue based on carbon credit prices by year with pro-rata logic
 * 
 * @param systemSize - Solar system size (will be normalized to kWp)
 * @param commissionDate - Date when system is commissioned (optional)
 * @param unit - Optional unit specification
 */
export function calculateRevenue(systemSize: string | number, commissionDate?: string | Date, unit?: string): Record<string, number> {
  const carbonCredits = calculateCarbonCredits(systemSize, unit);
  const revenue: Record<string, number> = {};
  
  // Parse commission date if provided
  const commissionDateTime = commissionDate ? new Date(commissionDate) : null;
  
  // Calculate revenue for each year based on carbon prices
  Object.entries(CARBON_PRICES).forEach(([year, price]) => {
    const yearNum = parseInt(year);
    let yearCredits = carbonCredits;
    
    // Apply pro-rata logic for commission year if date is provided
    if (commissionDateTime && yearNum === commissionDateTime.getFullYear()) {
      const yearStart = new Date(yearNum, 0, 1);
      const yearEnd = new Date(yearNum, 11, 31);
      const remainingDays = Math.max(0, Math.floor((yearEnd.getTime() - commissionDateTime.getTime()) / (1000 * 60 * 60 * 24)) + 1);
      const totalDaysInYear = Math.floor((yearEnd.getTime() - yearStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      
      // Pro-rate the credits for the partial year
      yearCredits = carbonCredits * (remainingDays / totalDaysInYear);
    }
    
    revenue[year] = Math.round(yearCredits * price);
  });
  
  return revenue;
}

/**
 * Calculate client share percentage based on portfolio size with correct tiers
 * 
 * @param portfolioSize - Total portfolio size (will be normalized to kWp)
 * @param unit - Optional unit specification
 */
export function getClientSharePercentage(portfolioSize: string | number, unit?: string): number {
  const sizeInKWp = normalizeToKWp(portfolioSize, unit);
  
  if (sizeInKWp < 5000) return 63;        // Less than 5,000 kWp
  if (sizeInKWp < 10000) return 66.5;     // 5,000–9,999 kWp
  if (sizeInKWp < 20000) return 67.9;     // 10,000-19,999 kWp
  if (sizeInKWp < 30000) return 70;       // 20,000–29,999 kWp
  return 73.5;                            // 30,000+ kWp
}

/**
 * Calculate agent commission percentage based on portfolio size
 * 
 * @param portfolioSize - Total portfolio size (will be normalized to kWp)
 * @param unit - Optional unit specification
 */
export function getAgentCommissionPercentage(portfolioSize: string | number, unit?: string): number {
  const sizeInKWp = normalizeToKWp(portfolioSize, unit);
  return sizeInKWp < 15000 ? 4 : 7;       // Less than 15,000 kWp
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
  
  // Calculate yearly data from commissioning to 2030
  const yearsData: YearData[] = [];
  const startYear = commissioningDate.getFullYear();
  const endYear = 2030;
  
  for (let year = startYear; year <= endYear; year++) {
    const isFirstYear = year === startYear;
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
  const totalCoalAvoided = fullYearGeneration * COAL_FACTOR;
  
  return {
    annualGeneration: fullYearGeneration,
    coalAvoided: totalCoalAvoided,
    carbonOffset: (fullYearGeneration * EMISSION_FACTOR) / 1000, // Convert kg to tonnes
    carbonCredits: Math.floor((fullYearGeneration * EMISSION_FACTOR) / 1000), // 1 credit = 1 tonne
    yearsData
  };
}
