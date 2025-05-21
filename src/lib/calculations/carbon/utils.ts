
/**
 * Utility functions for carbon calculations
 */
import { CARBON_PRICES } from './constants';

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
