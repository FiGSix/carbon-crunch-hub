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

  const annualEnergyKwh = calculateAnnualEnergy(systemSizeKwp);
  const carbonCreditsPerYear = calculateCarbonCredits(systemSizeKwp);

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

  const effectivePortfolioKWp = portfolioKWp || totalSystemSizeKwp;
  const clientSharePercentage = getClientSharePercentage(effectivePortfolioKWp);
  const agentCommissionPercentage = getAgentCommissionPercentage(effectivePortfolioKWp);

  // Calculate each phase
  const phaseRevenues = await Promise.all(
    phases.map(async (phase) => {
      const phaseAnnualEnergy = calculateAnnualEnergy(phase.sizeKWp);
      const phaseCarbonCredits = calculateCarbonCredits(phase.sizeKWp);
      const phaseRevenueByYear = await calculateRevenueByYear(
        phaseCarbonCredits,
        clientSharePercentage,
        phase.commissionDate
      );

      return {
        phaseNumber: phase.phaseNumber,
        phaseName: phase.phaseName,
        sizeKWp: phase.sizeKWp,
        commissionDate: phase.commissionDate,
        annualEnergyKwh: phaseAnnualEnergy,
        carbonCreditsPerYear: phaseCarbonCredits,
        revenueByYear: phaseRevenueByYear
      };
    })
  );

  // Aggregate revenue by year across all phases
  const aggregatedRevenueByYear: Record<string, number> = {};
  phaseRevenues.forEach(phase => {
    Object.entries(phase.revenueByYear).forEach(([year, revenue]) => {
      aggregatedRevenueByYear[year] = (aggregatedRevenueByYear[year] || 0) + revenue;
    });
  });

  // Calculate totals
  const totalAnnualEnergy = phaseRevenues.reduce((sum, p) => sum + p.annualEnergyKwh, 0);
  const totalCarbonCredits = phaseRevenues.reduce((sum, p) => sum + p.carbonCreditsPerYear, 0);
  const totalRevenue = Object.values(aggregatedRevenueByYear).reduce((sum, val) => sum + val, 0);
  
  const currentYear = new Date().getFullYear().toString();
  const currentYearRevenue = aggregatedRevenueByYear[currentYear] || 0;
  
  const totalRevenuePerYear = Math.round(totalCarbonCredits * 25);
  const agentCommissionPerYear = Math.round(totalRevenuePerYear * (agentCommissionPercentage / 100));
  
  const crunchCommissionPercentage = getCrunchCommissionPercentage(clientSharePercentage, agentCommissionPercentage);
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