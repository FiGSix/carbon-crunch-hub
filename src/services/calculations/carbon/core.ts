import { UserRole } from '@/contexts/auth/types';
import { SystemSpecs, CarbonCalculationResult, PhaseRevenue } from './types';
import { AGENT_COMMISSION_LOW, AGENT_COMMISSION_HIGH } from './constants';
import { normalizeToKWp, validateSystemSize } from './validation';
import { calculateAnnualEnergy, calculateCarbonCredits } from './calculations';
import { 
  getClientSharePercentage, 
  getAgentCommissionPercentage, 
  getCrunchCommissionPercentage, 
  calculateRevenueByYear,
  calculateRevenueByYearSync
} from './pricing';
import { dynamicCarbonPricingService } from '@/lib/calculations/carbon/dynamicPricing';
import { getYieldForProvince } from './regionalYields';

/**
 * Main calculation method - comprehensive carbon credits and revenue calculation
 */
export async function calculateComplete(
  specs: SystemSpecs,
  portfolioKWp?: number,
  userRole?: UserRole
): Promise<CarbonCalculationResult> {
  // Check if this is a multi-phase project
  if (specs.phases && specs.phases.length > 0) {
    return calculateMultiPhaseComplete(specs, portfolioKWp, userRole);
  }

  // Single-phase calculation (legacy)
  const systemSizeKwp = normalizeToKWp(specs.sizeKwp, specs.unitStandard);
  const validation = validateSystemSize(systemSizeKwp);
  
  if (!validation.isValid) {
    throw new Error(validation.error);
  }

  // Get regional yield factor
  const yieldFactor = await getYieldForProvince(specs.province);

  const annualEnergyKwh = calculateAnnualEnergy(systemSizeKwp, yieldFactor);
  const carbonCreditsPerYear = calculateCarbonCredits(systemSizeKwp, yieldFactor);

  const effectivePortfolioKWp = portfolioKWp || systemSizeKwp;
  const clientSharePercentage = getClientSharePercentage(effectivePortfolioKWp);
  const agentCommissionPercentage = getAgentCommissionPercentage(effectivePortfolioKWp);

  const revenueByYear = await calculateRevenueByYear(
    carbonCreditsPerYear,
    clientSharePercentage,
    specs.commissionDate
  );

  const currentYear = new Date().getFullYear().toString();
  const currentYearRevenue = revenueByYear[currentYear] || 0;
  
  const totalRevenuePerYear = Math.round(carbonCreditsPerYear * 25);
  const clientRevenuePerYear = currentYearRevenue;
  const agentCommissionPerYear = Math.round(totalRevenuePerYear * (agentCommissionPercentage / 100));
  
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
    revenueByYear,
    isMultiPhase: false
  };
}

/**
 * Multi-phase calculation method
 */
async function calculateMultiPhaseComplete(
  specs: SystemSpecs,
  portfolioKWp?: number,
  userRole?: UserRole
): Promise<CarbonCalculationResult> {
  const phases = specs.phases!;
  
  // Calculate total system size
  const totalSystemSizeKwp = phases.reduce((sum, p) => sum + p.sizeKWp, 0);
  const validation = validateSystemSize(totalSystemSizeKwp);
  
  if (!validation.isValid) {
    throw new Error(validation.error);
  }

  // OPTIMIZATION: Memoize portfolio-based percentages (Phase 3)
  const effectivePortfolioKWp = portfolioKWp || totalSystemSizeKwp;
  const clientSharePercentage = getClientSharePercentage(effectivePortfolioKWp);
  const agentCommissionPercentage = getAgentCommissionPercentage(effectivePortfolioKWp);
  const crunchCommissionPercentage = getCrunchCommissionPercentage(clientSharePercentage, agentCommissionPercentage);

  // OPTIMIZATION: Pre-fetch carbon prices once (Phase 1)
  const carbonPrices = await dynamicCarbonPricingService.getCarbonPrices();
  
  // Get regional yield factor
  const yieldFactor = await getYieldForProvince(specs.province);

  // OPTIMIZATION: Batch phase calculations using synchronous method (Phase 2)
  const phaseRevenues: PhaseRevenue[] = [];
  const aggregatedRevenueByYear: Record<string, number> = {};

  // Calculate each phase with pre-fetched prices
  phases.forEach((phase) => {
    const phaseAnnualEnergy = calculateAnnualEnergy(phase.sizeKWp, yieldFactor);
    const phaseCarbonCredits = calculateCarbonCredits(phase.sizeKWp, yieldFactor);
    
    // Use synchronous calculation with pre-fetched prices
    const phaseRevenueByYear = calculateRevenueByYearSync(
      phaseCarbonCredits,
      clientSharePercentage,
      carbonPrices,
      phase.commissionDate
    );

    // Aggregate revenue by year as we go
    Object.entries(phaseRevenueByYear).forEach(([year, revenue]) => {
      aggregatedRevenueByYear[year] = (aggregatedRevenueByYear[year] || 0) + revenue;
    });

    phaseRevenues.push({
      phaseNumber: phase.phaseNumber,
      phaseName: phase.phaseName,
      sizeKWp: phase.sizeKWp,
      commissionDate: phase.commissionDate,
      annualEnergyKwh: phaseAnnualEnergy,
      carbonCreditsPerYear: phaseCarbonCredits,
      revenueByYear: phaseRevenueByYear
    });
  });

  // Calculate totals
  const totalAnnualEnergy = phaseRevenues.reduce((sum, p) => sum + p.annualEnergyKwh, 0);
  const totalCarbonCredits = phaseRevenues.reduce((sum, p) => sum + p.carbonCreditsPerYear, 0);
  
  const currentYear = new Date().getFullYear().toString();
  const currentYearRevenue = aggregatedRevenueByYear[currentYear] || 0;
  
  const totalRevenuePerYear = Math.round(totalCarbonCredits * 25);
  const agentCommissionPerYear = Math.round(totalRevenuePerYear * (agentCommissionPercentage / 100));
  const crunchCommissionPerYear = Math.round(totalRevenuePerYear * (crunchCommissionPercentage / 100));

  return {
    annualEnergyKwh: totalAnnualEnergy,
    carbonCreditsPerYear: totalCarbonCredits,
    clientSharePercentage,
    agentCommissionPercentage,
    totalRevenuePerYear,
    clientRevenuePerYear: currentYearRevenue,
    agentCommissionPerYear,
    crunchCommissionPerYear,
    systemSizeKwp: totalSystemSizeKwp,
    revenueByYear: aggregatedRevenueByYear,
    isMultiPhase: true,
    phases: phaseRevenues
  };
}