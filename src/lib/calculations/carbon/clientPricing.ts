
/**
 * Client-specific carbon pricing calculations
 */
import { getClientSharePercentage } from './core';
import { getCarbonPriceForYear } from './utils';

/**
 * Calculate client-specific carbon price for a given year based on portfolio size
 * 
 * @param year - The year for which to calculate the price
 * @param portfolioSize - Total client portfolio size in kWp
 * @returns Client-specific carbon price in Rand per tCO₂e
 */
export async function getClientSpecificCarbonPrice(year: string | number, portfolioSize: number): Promise<number> {
  const marketPrice = await getCarbonPriceForYear(year);
  const clientSharePercentage = getClientSharePercentage(portfolioSize);
  
  return marketPrice * (clientSharePercentage / 100);
}

/**
 * Get formatted client-specific carbon price for display
 * 
 * @param year - The year for which to calculate the price
 * @param portfolioSize - Total client portfolio size in kWp
 * @returns Formatted price string with currency
 */
export async function getFormattedClientSpecificCarbonPrice(year: string | number, portfolioSize: number): Promise<string> {
  const price = await getClientSpecificCarbonPrice(year, portfolioSize);
  return price ? `R ${price.toFixed(2)}` : "";
}

/**
 * Calculate client-specific revenue for a given year and carbon credits (async version)
 * 
 * @param year - The year for which to calculate revenue
 * @param carbonCredits - Number of carbon credits (tCO₂e)
 * @param portfolioSize - Total client portfolio size in kWp
 * @returns Client-specific revenue in Rand
 */
export async function calculateClientSpecificRevenueAsync(year: string | number, carbonCredits: number, portfolioSize: number): Promise<number> {
  const clientPrice = await getClientSpecificCarbonPrice(year, portfolioSize);
  return Math.round(carbonCredits * clientPrice);
}

/**
 * Synchronous version for backward compatibility - calculates using dynamic pricing service directly
 * This provides a synchronous interface by using cached values when available
 */
export function calculateClientSpecificRevenue(year: string | number, carbonCredits: number, portfolioSize: number): number {
  // Import here to avoid circular dependencies
  const { dynamicCarbonPricingService } = require('./dynamicPricing');
  
  // Try to get cached price synchronously
  const cachedPrices = dynamicCarbonPricingService.cachedPrices;
  if (cachedPrices && cachedPrices[year.toString()]) {
    const marketPrice = cachedPrices[year.toString()];
    const clientSharePercentage = getClientSharePercentage(portfolioSize);
    const clientPrice = marketPrice * (clientSharePercentage / 100);
    return Math.round(carbonCredits * clientPrice);
  }
  
  // Return 0 if no cached data available
  return 0;
}
