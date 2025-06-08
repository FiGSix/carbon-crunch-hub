
/**
 * Revenue calculation functions using dynamic pricing exclusively
 */
import { dynamicCarbonPricingService } from './dynamicPricing';
import { calculateCarbonCredits } from './energy';

/**
 * Calculate projected revenue based on dynamic carbon credit prices by year with pro-rata logic
 * Only includes current and future years
 * 
 * @param systemSize - Solar system size (will be normalized to kWp)
 * @param commissionDate - Date when system is commissioned (optional)
 * @param unit - Optional unit specification
 */
export async function calculateRevenue(systemSize: string | number, commissionDate?: string | Date, unit?: string): Promise<Record<string, number>> {
  const carbonCredits = calculateCarbonCredits(systemSize);
  const revenue: Record<string, number> = {};
  
  // Get dynamic carbon prices (already filtered for current and future years)
  const carbonPrices = await dynamicCarbonPricingService.getCarbonPrices();
  
  // Parse commission date if provided
  const commissionDateTime = commissionDate ? new Date(commissionDate) : null;
  
  // Calculate revenue for each year based on dynamic carbon prices
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
    
    revenue[year] = Math.round(yearCredits * price);
  });
  
  return revenue;
}

/**
 * Synchronous version of calculateRevenue for backward compatibility
 * This will be deprecated - use the async version instead
 * 
 * @deprecated Use the async calculateRevenue function instead
 */
export function calculateRevenueSync(systemSize: string | number, commissionDate?: string | Date, unit?: string): Record<string, number> {
  console.warn('calculateRevenueSync is deprecated. Use the async calculateRevenue function instead.');
  // Return empty object for now - components should migrate to async version
  return {};
}
