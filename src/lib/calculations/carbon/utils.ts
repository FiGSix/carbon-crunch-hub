
/**
 * Utility functions for carbon calculations using dynamic pricing
 */
import { dynamicCarbonPricingService } from './dynamicPricing';

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
 * Get carbon price for a specific year as a number using dynamic pricing
 */
export async function getCarbonPriceForYear(year: string | number): Promise<number> {
  return await dynamicCarbonPricingService.getCarbonPriceForYear(year);
}

/**
 * Get carbon price for a specific year as a formatted string with currency using dynamic pricing
 */
export async function getFormattedCarbonPriceForYear(year: string | number): Promise<string> {
  const price = await getCarbonPriceForYear(year);
  return price ? `R ${price.toFixed(2)}` : "";
}
