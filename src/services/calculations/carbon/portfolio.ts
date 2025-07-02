import { PortfolioTotals } from './types';

/**
 * Calculate portfolio totals for dashboard metrics
 */
export function calculatePortfolioTotals(proposals: Array<{
  system_size_kwp?: number;
  carbon_credits?: number;
  annual_energy?: number;
}>): PortfolioTotals {
  const totals = proposals.reduce((acc, proposal) => {
    acc.totalSystemSizeKwp += proposal.system_size_kwp || 0;
    acc.totalCarbonCredits += proposal.carbon_credits || 0;
    acc.totalAnnualEnergy += proposal.annual_energy || 0;
    return acc;
  }, {
    totalSystemSizeKwp: 0,
    totalCarbonCredits: 0,
    totalAnnualEnergy: 0
  });

  return {
    ...totals,
    totalRevenue: totals.totalCarbonCredits * 25 // Using standard carbon price
  };
}