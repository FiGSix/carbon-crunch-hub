
/**
 * Simplified carbon calculations - all functions in one place
 */

// Constants
export const EMISSION_FACTOR = 0.928; // tCO₂/MWh
export const AVERAGE_SUN_HOURS = 4.5;
export const DAYS_IN_YEAR = 365;

/**
 * Normalize system size to kWp
 */
export function normalizeToKWp(systemSize: string | number, unit?: string): number {
  if (typeof systemSize === 'string') {
    const sizeStr = systemSize.toLowerCase().trim();
    const numericValue = parseFloat(sizeStr);
    
    if (isNaN(numericValue)) return 0;
    
    if (sizeStr.includes('mwp') || sizeStr.includes('mw')) {
      return numericValue * 1000;
    } else {
      return numericValue;
    }
  }
  
  const sizeValue = typeof systemSize === 'number' ? systemSize : parseFloat(systemSize);
  return isNaN(sizeValue) ? 0 : sizeValue;
}

/**
 * Format system size for display
 */
export function formatSystemSizeForDisplay(systemSizeKWp: number): string {
  if (systemSizeKWp >= 1000) {
    return `${(systemSizeKWp / 1000).toFixed(2)} MWp`;
  }
  return `${systemSizeKWp.toFixed(1)} kWp`;
}

/**
 * Calculate annual energy production
 */
export function calculateAnnualEnergy(systemSizeKWp: number): number {
  const dailyKWh = systemSizeKWp * AVERAGE_SUN_HOURS;
  return dailyKWh * DAYS_IN_YEAR;
}

/**
 * Calculate carbon credits
 */
export function calculateCarbonCredits(systemSizeKWp: number, unit?: string): number {
  const normalizedSize = typeof systemSizeKWp === 'string' 
    ? normalizeToKWp(systemSizeKWp, unit) 
    : systemSizeKWp;
  const annualEnergy = calculateAnnualEnergy(normalizedSize);
  return (annualEnergy / 1000) * EMISSION_FACTOR;
}

/**
 * Simple revenue calculation with fixed carbon price
 */
export function calculateRevenue(carbonCredits: number, sharePercentage: number): number {
  const CARBON_PRICE = 25; // AUD per tonne - simplified fixed price
  return Math.round(carbonCredits * CARBON_PRICE * (sharePercentage / 100));
}

/**
 * Client share percentage based on portfolio
 */
export function getClientSharePercentage(portfolioKWp: number): number {
  if (portfolioKWp < 5000) return 63;
  if (portfolioKWp < 10000) return 66.5;
  if (portfolioKWp < 20000) return 67.9;
  if (portfolioKWp < 30000) return 70;
  return 73.5;
}

/**
 * Agent commission percentage based on portfolio
 */
export function getAgentCommissionPercentage(portfolioKWp: number): number {
  return portfolioKWp < 15000 ? 4 : 7;
}
