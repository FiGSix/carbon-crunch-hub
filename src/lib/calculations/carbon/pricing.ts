
/**
 * Client pricing and commission calculation functions
 */
import { normalizeToKWp } from './normalization';

/**
 * Calculate client share percentage based on portfolio size with correct tiers
 * 
 * @param portfolioSize - Total portfolio size (will be normalized to kWp)
 * @param unit - Optional unit specification
 */
export function getClientSharePercentage(portfolioSize: string | number, unit?: string): number {
  const sizeInKWp = normalizeToKWp(portfolioSize, unit);
  
  if (sizeInKWp < 5000) return 63;        // Less than 5,000 kWp
  if (sizeInKWp < 10000) return 66.5;     // 5,000–9,999 kWp
  if (sizeInKWp < 20000) return 67.9;     // 10,000-19,999 kWp
  if (sizeInKWp < 30000) return 70;       // 20,000–29,999 kWp
  return 73.5;                            // 30,000+ kWp
}

/**
 * Calculate agent commission percentage based on portfolio size
 * 
 * @param portfolioSize - Total portfolio size (will be normalized to kWp)
 * @param unit - Optional unit specification
 */
export function getAgentCommissionPercentage(portfolioSize: string | number, unit?: string): number {
  const sizeInKWp = normalizeToKWp(portfolioSize, unit);
  return sizeInKWp < 15000 ? 4 : 7;       // Less than 15,000 kWp
}
