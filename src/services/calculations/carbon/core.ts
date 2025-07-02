import { UserRole } from '@/contexts/auth/types';
import { SystemSpecs, CarbonCalculationResult } from './types';
import { AGENT_COMMISSION_LOW, AGENT_COMMISSION_HIGH } from './constants';
import { normalizeToKWp, validateSystemSize } from './validation';
import { calculateAnnualEnergy, calculateCarbonCredits } from './calculations';
import { getClientSharePercentage, getAgentCommissionPercentage, getCrunchCommissionPercentage, calculateRevenueByYear } from './pricing';

/**
 * Main calculation method - comprehensive carbon credits and revenue calculation
 */
export async function calculateComplete(
  specs: SystemSpecs,
  portfolioKWp?: number,
  userRole?: UserRole
): Promise<CarbonCalculationResult> {
  // Normalize and validate system size
  const systemSizeKwp = normalizeToKWp(specs.sizeKwp, specs.unitStandard);
  const validation = validateSystemSize(systemSizeKwp);
  
  if (!validation.isValid) {
    throw new Error(validation.error);
  }

  // Calculate basic metrics
  const annualEnergyKwh = calculateAnnualEnergy(systemSizeKwp);
  const carbonCreditsPerYear = calculateCarbonCredits(systemSizeKwp);

  // Determine portfolio size for share calculations
  const effectivePortfolioKWp = portfolioKWp || systemSizeKwp;
  const clientSharePercentage = getClientSharePercentage(effectivePortfolioKWp);
  const agentCommissionPercentage = getAgentCommissionPercentage(effectivePortfolioKWp);

  // Calculate revenue by year
  const revenueByYear = await calculateRevenueByYear(
    carbonCreditsPerYear,
    clientSharePercentage,
    specs.commissionDate
  );

  // Calculate total annual revenue (using current year price)
  const currentYear = new Date().getFullYear().toString();
  const currentYearRevenue = revenueByYear[currentYear] || 0;
  
  // Calculate revenue distributions
  const totalRevenuePerYear = Math.round(carbonCreditsPerYear * 25); // Fallback calculation
  const clientRevenuePerYear = currentYearRevenue;
  const agentCommissionPerYear = Math.round(totalRevenuePerYear * (agentCommissionPercentage / 100));
  
  // Calculate Crunch commission dynamically using the new function
  const crunchCommissionPercentage = getCrunchCommissionPercentage(clientSharePercentage, agentCommissionPercentage);
  const crunchCommissionPerYear = Math.round(totalRevenuePerYear * (crunchCommissionPercentage / 100));

  return {
    annualEnergyKwh,
    carbonCreditsPerYear,
    clientSharePercentage,
    agentCommissionPercentage,
    totalRevenuePerYear,
    clientRevenuePerYear,
    agentCommissionPerYear,
    crunchCommissionPerYear,
    systemSizeKwp,
    revenueByYear
  };
}