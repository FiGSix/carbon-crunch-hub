
import { calculateAnnualEnergy, EMISSION_FACTOR, normalizeToKWp } from "@/lib/calculations/carbon";

/**
 * Helper function to calculate pro-rated energy generation for a specific year
 * Updated to handle January 1st commissioning as full years
 */
export function calculateYearlyEnergy(systemSizeKWp: number, year: number, commissionDate?: string): number {
  const fullYearEnergy = calculateAnnualEnergy(systemSizeKWp);
  
  if (!commissionDate) {
    return fullYearEnergy;
  }
  
  const commissionDateTime = new Date(commissionDate);
  const commissionYear = commissionDateTime.getFullYear();
  
  // Apply pro-rata logic for commission year
  if (year === commissionYear) {
    // Check if commissioning happens at the very beginning of the year (January 1st)
    const isJanuary1st = commissionDateTime.getMonth() === 0 && commissionDateTime.getDate() === 1;
    
    if (isJanuary1st) {
      // If commissioned on January 1st, treat as full year
      return fullYearEnergy;
    }
    
    // For other dates, apply pro-rata logic
    const yearStart = new Date(year, 0, 1);
    const yearEnd = new Date(year, 11, 31);
    const remainingDays = Math.max(0, Math.floor((yearEnd.getTime() - commissionDateTime.getTime()) / (1000 * 60 * 60 * 24)) + 1);
    const totalDaysInYear = Math.floor((yearEnd.getTime() - yearStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    
    return fullYearEnergy * (remainingDays / totalDaysInYear);
  }
  
  return fullYearEnergy;
}

/**
 * Helper function to calculate pro-rated carbon credits for a specific year using standardized emission factor
 */
export function calculateYearlyCarbonCredits(systemSizeKWp: number, year: number, commissionDate?: string): number {
  const yearlyEnergy = calculateYearlyEnergy(systemSizeKWp, year, commissionDate);
  // Convert kWh to MWh and then to tCO₂ using the standardized emission factor (0.928 tCO₂/MWh)
  return (yearlyEnergy / 1000) * EMISSION_FACTOR;
}

/**
 * Calculate total MWh generated across all years
 */
export function calculateTotalMWhGenerated(
  systemSizeKWp: number, 
  revenue: Record<string, number>, 
  commissionDate?: string
): number {
  return Object.keys(revenue).reduce((total, year) => {
    const yearlyEnergy = calculateYearlyEnergy(systemSizeKWp, parseInt(year), commissionDate);
    return total + (yearlyEnergy / 1000); // Convert kWh to MWh
  }, 0);
}

/**
 * Calculate total carbon credits across all years
 */
export function calculateTotalCarbonCredits(
  systemSizeKWp: number, 
  revenue: Record<string, number>, 
  commissionDate?: string
): number {
  return Object.keys(revenue).reduce((total, year) => {
    const yearlyCarbonCredits = calculateYearlyCarbonCredits(systemSizeKWp, parseInt(year), commissionDate);
    return total + yearlyCarbonCredits;
  }, 0);
}
