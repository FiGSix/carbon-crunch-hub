import { dynamicCarbonPricingService } from '@/lib/calculations/carbon/dynamicPricing';
import { AGENT_COMMISSION_LOW, AGENT_COMMISSION_HIGH } from './constants';

/**
 * Get client share percentage based on portfolio size
 */
export function getClientSharePercentage(portfolioKWp: number): number {
  if (portfolioKWp < 5000) return 60.20;  // 0-5MWp
  if (portfolioKWp < 10000) return 63;    // 5-10MWp
  if (portfolioKWp < 20000) return 66.5;  // 10-20MWp
  if (portfolioKWp < 30000) return 68.25; // 20-30MWp
  return 70; // 30+MWp
}

/**
 * Get agent commission percentage based on company portfolio size.
 * 4% under 15 MWp, 7% at 15 MWp+.
 * If no agent involved (added by Crunch Carbon), returns 0%.
 * Profile-level commission overrides are no longer consulted — the
 * controlling override is on the company.
 */
export function getAgentCommissionPercentage(
  companyKWp: number,
  hasAgent: boolean = true,
): number {
  if (!hasAgent) return 0;
  return companyKWp < 15000 ? AGENT_COMMISSION_LOW : AGENT_COMMISSION_HIGH;
}

/**
 * Calculate Crunch Carbon platform fee dynamically
 * Formula: 100% - Client Share % - Agent Commission %
 */
export function getCrunchCommissionPercentage(
  clientSharePercentage: number,
  agentCommissionPercentage: number
): number {
  return 100 - clientSharePercentage - agentCommissionPercentage;
}

/**
 * Calculate revenue by year using pre-fetched carbon prices (synchronous, optimized)
 */
export function calculateRevenueByYearSync(
  carbonCreditsPerYear: number,
  clientSharePercentage: number,
  carbonPrices: Record<string, number>,
  commissionDate?: string | Date
): Record<string, number> {
  const revenue: Record<string, number> = {};
  const commissionDateTime = commissionDate ? new Date(commissionDate) : null;
  
  Object.entries(carbonPrices).forEach(([year, price]) => {
    const yearNum = parseInt(year);
    
    // Skip years before commissioning date
    if (commissionDateTime && yearNum < commissionDateTime.getFullYear()) {
      return;
    }
    
    let yearCredits = carbonCreditsPerYear;
    
    // Pro-rate for commission year if date is provided
    if (commissionDateTime && yearNum === commissionDateTime.getFullYear()) {
      const yearStart = new Date(yearNum, 0, 1);
      const yearEnd = new Date(yearNum, 11, 31);
      const remainingDays = Math.max(0, Math.floor((yearEnd.getTime() - commissionDateTime.getTime()) / (1000 * 60 * 60 * 24)) + 1);
      const totalDaysInYear = Math.floor((yearEnd.getTime() - yearStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      
      yearCredits = carbonCreditsPerYear * (remainingDays / totalDaysInYear);
    }
    
    revenue[year] = Math.round(yearCredits * price * (clientSharePercentage / 100));
  });
  
  return revenue;
}

/**
 * Calculate revenue by year using dynamic pricing (async version for backward compatibility)
 */
export async function calculateRevenueByYear(
  carbonCreditsPerYear: number,
  clientSharePercentage: number,
  commissionDate?: string | Date
): Promise<Record<string, number>> {
  const carbonPrices = await dynamicCarbonPricingService.getCarbonPrices();
  return calculateRevenueByYearSync(carbonCreditsPerYear, clientSharePercentage, carbonPrices, commissionDate);
}