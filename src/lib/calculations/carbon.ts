
/**
 * Carbon Calculations Module
 * 
 * This module centralizes all carbon-related calculations and constants
 * to ensure consistency across the application.
 */

// ===== TYPES =====
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

// ===== CONSTANTS =====

/**
 * Carbon emission factor: 1.033 kg CO₂ per kWh
 * This is the amount of CO₂ emissions avoided per kWh of renewable energy
 */
export const EMISSION_FACTOR = 1.033;

/**
 * Coal factor: 0.33 kg of coal per kWh
 * This represents the amount of coal needed to produce 1 kWh of electricity
 */
export const COAL_FACTOR = 0.33;

/**
 * Average sun hours per day for solar calculation
 */
export const AVERAGE_SUN_HOURS = 4.5;

/**
 * Days in a standard year (non-leap year)
 */
export const DAYS_IN_YEAR = 365;

/**
 * Carbon prices by year (in Rand per tCO₂)
 */
export const CARBON_PRICES: Record<string, number> = {
  "2024": 78.36,
  "2025": 93.19,
  "2026": 110.78,
  "2027": 131.64,
  "2028": 156.30,
  "2029": 185.30,
  "2030": 190.55
};

// ===== UTILITY FUNCTIONS =====

/**
 * Format a number with appropriate suffixes (k, M)
 */
export function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  } else if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'k';
  } else {
    return num.toFixed(1);
  }
}

/**
 * Get carbon price for a specific year as a number
 */
export function getCarbonPriceForYear(year: string | number): number {
  const yearStr = year.toString();
  return CARBON_PRICES[yearStr] || 0;
}

/**
 * Get carbon price for a specific year as a formatted string with currency
 */
export function getFormattedCarbonPriceForYear(year: string | number): string {
  const price = getCarbonPriceForYear(year);
  return price ? `R ${price.toFixed(2)}` : "";
}

// ===== CORE CALCULATION FUNCTIONS =====

/**
 * Calculate the annual energy production in kWh based on system size
 * 
 * @param systemSize - Solar system size in kWp (as string)
 * @param isMWp - Whether the system size is in MWp (default false)
 */
export function calculateAnnualEnergy(systemSize: string | number, isMWp: boolean = false): number {
  // Parse input and convert to kWp if needed
  const size = typeof systemSize === 'string' ? parseFloat(systemSize) : systemSize;
  const sizeInKWp = isMWp ? size * 1000 : size; // Convert MWp to kWp only if flagged as MWp
  
  // Calculate daily and annual energy
  const dailyKWh = sizeInKWp * AVERAGE_SUN_HOURS;
  return dailyKWh * DAYS_IN_YEAR; // Annual energy in kWh
}

/**
 * Calculate the carbon credits based on annual energy production
 * 
 * @param systemSize - Solar system size in kWp (as string)
 * @param isMWp - Whether the system size is in MWp (default false)
 */
export function calculateCarbonCredits(systemSize: string | number, isMWp: boolean = false): number {
  const annualEnergy = calculateAnnualEnergy(systemSize, isMWp);
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
 * Calculate projected revenue based on carbon credit prices by year
 * 
 * @param systemSize - Solar system size in kWp
 * @param isMWp - Whether the system size is in MWp (default false)
 */
export function calculateRevenue(systemSize: string | number, isMWp: boolean = false): Record<string, number> {
  const carbonCredits = calculateCarbonCredits(systemSize, isMWp);
  const revenue: Record<string, number> = {};
  
  // Calculate revenue for each year based on carbon prices
  Object.entries(CARBON_PRICES).forEach(([year, price]) => {
    revenue[year] = Math.round(carbonCredits * price);
  });
  
  return revenue;
}

/**
 * Calculate client share percentage based on portfolio size
 * 
 * @param portfolioSize - Portfolio size in kWp
 */
export function getClientSharePercentage(portfolioSize: string | number): number {
  const size = typeof portfolioSize === 'string' ? parseFloat(portfolioSize) : portfolioSize;
  
  if (size < 5000) return 63;       // Less than 5,000 kWp (5 MWp)
  if (size < 10000) return 66.5;    // Less than 10,000 kWp (10 MWp)
  if (size < 30000) return 70;      // Less than 30,000 kWp (30 MWp)
  return 73.5;                      // 30,000+ kWp (30+ MWp)
}

/**
 * Calculate agent commission percentage
 * 
 * @param portfolioSize - Portfolio size in kWp
 */
export function getAgentCommissionPercentage(portfolioSize: string | number): number {
  const size = typeof portfolioSize === 'string' ? parseFloat(portfolioSize) : portfolioSize;
  return size < 15000 ? 4 : 7;      // Less than 15,000 kWp (15 MWp)
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
