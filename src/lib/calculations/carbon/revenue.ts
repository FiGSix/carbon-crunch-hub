
/**
 * Revenue calculation functions
 */
import { CARBON_PRICES } from './constants';
import { calculateCarbonCredits } from './energy';

/**
 * Get current year for filtering past years
 */
function getCurrentYear(): number {
  return new Date().getFullYear();
}

/**
 * Filter carbon prices to exclude past years
 * 
 * @param prices - Carbon prices object
 */
function filterCurrentAndFuturePrices(prices: Record<string, number>): Record<string, number> {
  const currentYear = getCurrentYear();
  const filteredPrices: Record<string, number> = {};
  
  Object.entries(prices).forEach(([year, price]) => {
    const yearNum = parseInt(year);
    if (yearNum >= currentYear) {
      filteredPrices[year] = price;
    }
  });
  
  return filteredPrices;
}

/**
 * Calculate projected revenue based on carbon credit prices by year with pro-rata logic
 * Only includes current and future years
 * 
 * @param systemSize - Solar system size (will be normalized to kWp)
 * @param commissionDate - Date when system is commissioned (optional)
 * @param unit - Optional unit specification
 */
export function calculateRevenue(systemSize: string | number, commissionDate?: string | Date, unit?: string): Record<string, number> {
  const carbonCredits = calculateCarbonCredits(systemSize, unit);
  const revenue: Record<string, number> = {};
  
  // Filter out past years from carbon prices
  const currentAndFuturePrices = filterCurrentAndFuturePrices(CARBON_PRICES);
  
  // Parse commission date if provided
  const commissionDateTime = commissionDate ? new Date(commissionDate) : null;
  
  // Calculate revenue for each year based on carbon prices (current and future years only)
  Object.entries(currentAndFuturePrices).forEach(([year, price]) => {
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
