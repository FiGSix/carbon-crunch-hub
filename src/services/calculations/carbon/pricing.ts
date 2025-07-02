import { dynamicCarbonPricingService } from '@/lib/calculations/carbon/dynamicPricing';
import { AGENT_COMMISSION_LOW, AGENT_COMMISSION_HIGH } from './constants';

/**
 * Get client share percentage based on portfolio size
 */
export function getClientSharePercentage(portfolioKWp: number): number {
  if (portfolioKWp < 5000) return 63;
  if (portfolioKWp < 10000) return 66.5;
  if (portfolioKWp < 20000) return 67.9;
  if (portfolioKWp < 30000) return 70;
  return 73.5;
}

/**
 * Get agent commission percentage based on portfolio size and signed projects
 * If no agent involved (added by Crunch Carbon), returns 0%
 * If agent involved, returns 4% or 7% based on their signed projects
 */
export function getAgentCommissionPercentage(
  portfolioKWp: number, 
  signedProjects?: number,
  hasAgent: boolean = true
): number {
  // If no agent involved (added directly by Crunch Carbon)
  if (!hasAgent) return 0;
  
  // If agent is involved, determine commission based on signed projects
  // For now, using portfolio size as proxy. Can be updated to use signedProjects parameter
  return portfolioKWp < 15000 ? AGENT_COMMISSION_LOW : AGENT_COMMISSION_HIGH;
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
 * Calculate revenue by year using dynamic pricing
 */
export async function calculateRevenueByYear(
  carbonCreditsPerYear: number,
  clientSharePercentage: number,
  commissionDate?: string | Date
): Promise<Record<string, number>> {
  const carbonPrices = await dynamicCarbonPricingService.getCarbonPrices();
  const revenue: Record<string, number> = {};
  
  const commissionDateTime = commissionDate ? new Date(commissionDate) : null;
  
  Object.entries(carbonPrices).forEach(([year, price]) => {
    const yearNum = parseInt(year);
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