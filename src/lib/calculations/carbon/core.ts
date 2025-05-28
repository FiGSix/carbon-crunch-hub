
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
 * Calculate the annual energy production in kWh based on system size
 * 
 * @param systemSize - Solar system size in kWp (as string)
 */
export function calculateAnnualEnergy(systemSize: string | number): number {
  // Parse input
  const sizeInKWp = typeof systemSize === 'string' ? parseFloat(systemSize) : systemSize;
  
  // Calculate daily and annual energy
  const dailyKWh = sizeInKWp * AVERAGE_SUN_HOURS;
  return dailyKWh * DAYS_IN_YEAR; // Annual energy in kWh
}

/**
 * Calculate the carbon credits based on annual energy production
 * 
 * @param systemSize - Solar system size in kWp (as string)
 */
export function calculateCarbonCredits(systemSize: string | number): number {
  const annualEnergy = calculateAnnualEnergy(systemSize);
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
 * @param systemSize - Solar system size in kWp
 * @param commissionDate - Date when system is commissioned (optional)
 */
export function calculateRevenue(systemSize: string | number, commissionDate?: string | Date): Record<string, number> {
  const carbonCredits = calculateCarbonCredits(systemSize);
  const revenue: Record<string, number> = {};
  
  // Parse commission date if provided
  const commissionDateTime = commissionDate ? new Date(commissionDate) : null;
  const currentYear = new Date().getFullYear();
  
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
 * Calculate client share percentage based on portfolio size with all tiers
 * 
 * @param portfolioSize - Total portfolio size in kWp across all client projects
 */
export function getClientSharePercentage(portfolioSize: string | number): number {
  const size = typeof portfolioSize === 'string' ? parseFloat(portfolioSize) : portfolioSize;
  
  if (size < 1000) return 60;        // Less than 1,000 kWp - NEW TIER
  if (size < 5000) return 63;        // Less than 5,000 kWp
  if (size < 10000) return 66.5;     // Less than 10,000 kWp 
  if (size < 30000) return 70;       // Less than 30,000 kWp
  return 73.5;                       // 30,000+ kWp
}

/**
 * Calculate agent commission percentage based on portfolio size
 * 
 * @param portfolioSize - Total portfolio size in kWp across all client projects
 */
export function getAgentCommissionPercentage(portfolioSize: string | number): number {
  const size = typeof portfolioSize === 'string' ? parseFloat(portfolioSize) : portfolioSize;
  return size < 15000 ? 4 : 7;       // Less than 15,000 kWp
}

/**
 * Calculate results for a solar system based on size and commissioning date
 * 
 * @param systemSize - System size in kWp
 * @param commissioningDate - Date when system is commissioned
 */
export function calculateResults(systemSize: number, commissioningDate: Date): CalculationResults {
  const dailyGeneration = systemSize * AVERAGE_SUN_HOURS; // kWh per day
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
