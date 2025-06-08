
/**
 * Agent commission calculation functions
 */
import { dynamicCarbonPricingService } from './dynamicPricing';
import { calculateCarbonCredits } from './energy';

/**
 * Calculate agent commission revenue by year with dynamic pricing
 * 
 * @param systemSize - Solar system size (will be normalized to kWp)
 * @param agentCommissionPercentage - Agent commission percentage
 * @param commissionDate - Date when system is commissioned (optional)
 * @param unit - Optional unit specification
 */
export async function calculateAgentCommissionRevenue(
  systemSize: string | number, 
  agentCommissionPercentage: number,
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
    commissionRevenue[year] = Math.round(yearCredits * price * (agentCommissionPercentage / 100));
  });
  
  return commissionRevenue;
}

/**
 * Calculate total agent commission over multiple years
 * 
 * @param agentCommissionRevenue - Agent commission revenue by year
 * @param startYear - Start year (optional, defaults to current year)
 * @param endYear - End year (optional, defaults to 2030)
 */
export function calculateTotalAgentCommission(
  agentCommissionRevenue: Record<string, number>,
  startYear?: number,
  endYear: number = 2030
): number {
  const currentYear = startYear || new Date().getFullYear();
  
  return Object.entries(agentCommissionRevenue)
    .filter(([year]) => {
      const yearNum = parseInt(year);
      return yearNum >= currentYear && yearNum <= endYear;
    })
    .reduce((total, [, revenue]) => total + revenue, 0);
}
