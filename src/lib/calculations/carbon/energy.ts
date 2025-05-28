
/**
 * Energy and carbon credit calculation functions
 */
import { EMISSION_FACTOR, COAL_FACTOR, AVERAGE_SUN_HOURS, DAYS_IN_YEAR } from './constants';
import { normalizeToKWp } from './normalization';

/**
 * Calculate the annual energy production in kWh based on system size in kWp
 * 
 * @param systemSize - Solar system size (will be normalized to kWp)
 * @param unit - Optional unit specification
 */
export function calculateAnnualEnergy(systemSize: string | number, unit?: string): number {
  const sizeInKWp = normalizeToKWp(systemSize, unit);
  
  // Calculate daily and annual energy
  const dailyKWh = sizeInKWp * AVERAGE_SUN_HOURS;
  return dailyKWh * DAYS_IN_YEAR; // Annual energy in kWh
}

/**
 * Calculate the carbon credits based on annual energy production
 * 
 * @param systemSize - Solar system size (will be normalized to kWp)
 * @param unit - Optional unit specification
 */
export function calculateCarbonCredits(systemSize: string | number, unit?: string): number {
  const annualEnergy = calculateAnnualEnergy(systemSize, unit);
  // Convert kWh to MWh and then to tCO2 using the emission factor
  return (annualEnergy / 1000) * EMISSION_FACTOR;
}

/**
 * Calculate coal avoided based on energy production
 * 
 * @param energyInKWh - Energy production in kWh
 */
export function calculateCoalAvoided(energyInKWh: number): number {
  return energyInKWh * COAL_FACTOR;
}
