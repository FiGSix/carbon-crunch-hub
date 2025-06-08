
/**
 * Crunch Carbon commission calculation functions
 */
import { dynamicCarbonPricingService } from './dynamicPricing';
import { calculateCarbonCredits } from './energy';

/**
 * Calculate Crunch Carbon commission revenue by year with dynamic pricing
 * 
 * @param systemSize - Solar system size (will be normalized to kWp)
 * @param crunchCommissionPercentage - Crunch Carbon commission percentage (typically 30-35%)
 * @param commissionDate - Date when system is commissioned (optional)
 * @param unit - Optional unit specification
 */
export async function calculateCrunchCommissionRevenue(
  systemSize: string | number, 
  crunchCommissionPercentage: number,
  commissionDate?: string | Date, 
  unit?: string
): Promise<Record<string, number>> {
  const carbonCredits = calculateCarbonCredits(systemSize);
  const commissionRevenue: Record<string, number> = {};
  
  // Get dynamic carbon prices (already filtered for current and future years)
  const carbonPrices = await dynamicCarbonPricingService.getCarbonPrices();
  
  // Parse commission date if provided
  const commissionDateTime = commissionDate ? new Date(commissionDate) : null;
  
  // Calculate commission revenue for each year based on dynamic carbon prices
  Object.entries(carbonPrices).forEach(([year, price]) => {
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
    
    // Calculate commission revenue: credits * price * commission percentage
    commissionRevenue[year] = Math.round(yearCredits * price * (crunchCommissionPercentage / 100));
  });
  
  return commissionRevenue;
}

/**
 * Get Crunch Carbon commission percentage based on portfolio size
 * The remainder after client share and agent commission goes to Crunch Carbon
 * 
 * @param clientSharePercentage - Client's share percentage
 * @param agentCommissionPercentage - Agent's commission percentage
 */
export function getCrunchCommissionPercentage(
  clientSharePercentage: number,
  agentCommissionPercentage: number
): number {
  return 100 - clientSharePercentage - agentCommissionPercentage;
}
