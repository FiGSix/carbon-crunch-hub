
/**
 * Client-specific carbon pricing calculations
 */
import { getCarbonPriceForYear, getClientSharePercentage } from './core';

/**
 * Calculate client-specific carbon price for a given year based on portfolio size
 * 
 * @param year - The year for which to calculate the price
 * @param portfolioSize - Total client portfolio size in kWp
 * @returns Client-specific carbon price in Rand per tCO₂e
 */
export function getClientSpecificCarbonPrice(year: string | number, portfolioSize: number): number {
  const marketPrice = getCarbonPriceForYear(year);
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
export function getFormattedClientSpecificCarbonPrice(year: string | number, portfolioSize: number): string {
  const price = getClientSpecificCarbonPrice(year, portfolioSize);
  return price ? `R ${price.toFixed(2)}` : "";
}

/**
 * Calculate client-specific revenue for a given year and carbon credits
 * 
 * @param year - The year for which to calculate revenue
 * @param carbonCredits - Number of carbon credits (tCO₂e)
 * @param portfolioSize - Total client portfolio size in kWp
 * @returns Client-specific revenue in Rand
 */
export function calculateClientSpecificRevenue(year: string | number, carbonCredits: number, portfolioSize: number): number {
  const clientPrice = getClientSpecificCarbonPrice(year, portfolioSize);
  return Math.round(carbonCredits * clientPrice);
}
