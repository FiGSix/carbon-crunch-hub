
/**
 * Revenue calculation utilities for proposals - now using UnifiedCarbonService
 */
import { UnifiedCarbonService } from '@/services/calculations/carbon';
import { dynamicCarbonPricingService } from '@/lib/calculations/carbon/dynamicPricing';

/**
 * Calculate revenue using dynamic carbon pricing and unified service
 */
export async function calculateProposalRevenue(
  carbonCredits: number, 
  clientSharePercentage: number, 
  commissionDate?: string
): Promise<number> {
  if (!carbonCredits || !clientSharePercentage) {
    return 0;
  }

  try {
    // Get current year carbon price as the baseline
    const currentYear = new Date().getFullYear();
    const carbonPrice = await dynamicCarbonPricingService.getCarbonPriceForYear(currentYear);
    
    if (!carbonPrice) {
      console.warn('No carbon price found for current year, using fallback calculation');
      return 0;
    }

    // Calculate total revenue: carbon credits * price per credit * client share
    const totalRevenue = carbonCredits * carbonPrice * (clientSharePercentage / 100);
    
    return Math.round(totalRevenue);
  } catch (error) {
    console.error('Error calculating proposal revenue:', error);
    return 0;
  }
}

/**
 * Calculate agent commission revenue using unified service
 */
export async function calculateAgentCommissionRevenue(
  carbonCredits: number, 
  agentCommissionPercentage: number, 
  commissionDate?: string
): Promise<number> {
  if (!carbonCredits || !agentCommissionPercentage) {
    return 0;
  }

  try {
    // Get current year carbon price as the baseline
    const currentYear = new Date().getFullYear();
    const carbonPrice = await dynamicCarbonPricingService.getCarbonPriceForYear(currentYear);
    
    if (!carbonPrice) {
      console.warn('No carbon price found for current year, using fallback calculation');
      return 0;
    }

    // Calculate agent commission revenue: carbon credits * price per credit * agent commission
    const commissionRevenue = carbonCredits * carbonPrice * (agentCommissionPercentage / 100);
    
    return Math.round(commissionRevenue);
  } catch (error) {
    console.error('Error calculating agent commission revenue:', error);
    return 0;
  }
}

/**
 * Calculate complete proposal financials using unified service
 */
export async function calculateCompleteProposalFinancials(
  systemSizeKWp: number,
  portfolioKWp?: number,
  commissionDate?: string,
  clientShareOverride?: number
) {
  try {
    const result = await UnifiedCarbonService.calculateComplete({
      sizeKwp: systemSizeKWp,
      commissionDate,
      clientShareOverride
    }, portfolioKWp);

    return result;
  } catch (error) {
    console.error('Error calculating complete proposal financials:', error);
    return null;
  }
}
