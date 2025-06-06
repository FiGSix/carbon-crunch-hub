
/**
 * Revenue calculation utilities for proposals
 */
import { dynamicCarbonPricingService } from '@/lib/calculations/carbon/dynamicPricing';

/**
 * Calculate revenue using dynamic carbon pricing
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
 * Calculate agent commission revenue using dynamic carbon pricing
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
