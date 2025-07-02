import { DEFAULT_ANNUAL_GENERATION_FACTOR, DEFAULT_CARBON_FACTOR } from './constants';

/**
 * Calculate annual energy generation
 */
export function calculateAnnualEnergy(systemSizeKwp: number): number {
  return systemSizeKwp * DEFAULT_ANNUAL_GENERATION_FACTOR;
}

/**
 * Calculate carbon credits (tonnes CO2 per year)
 */
export function calculateCarbonCredits(systemSizeKwp: number): number {
  const annualEnergyKwh = calculateAnnualEnergy(systemSizeKwp);
  return (annualEnergyKwh / 1000) * DEFAULT_CARBON_FACTOR;
}