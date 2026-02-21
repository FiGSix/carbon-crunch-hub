import { DEFAULT_ANNUAL_GENERATION_FACTOR, DEFAULT_CARBON_FACTOR } from './constants';

/**
 * Calculate annual energy generation.
 * Accepts an optional yieldFactor (kWh/kWp/year) for regional calculations.
 * If not provided, uses the national average (1,642.50).
 */
export function calculateAnnualEnergy(systemSizeKwp: number, yieldFactor?: number): number {
  return systemSizeKwp * (yieldFactor ?? DEFAULT_ANNUAL_GENERATION_FACTOR);
}

/**
 * Calculate carbon credits (tonnes CO2 per year).
 * Accepts an optional yieldFactor for regional calculations.
 */
export function calculateCarbonCredits(systemSizeKwp: number, yieldFactor?: number): number {
  const annualEnergyKwh = calculateAnnualEnergy(systemSizeKwp, yieldFactor);
  return (annualEnergyKwh / 1000) * DEFAULT_CARBON_FACTOR;
}