
/**
 * Carbon calculation constants
 */

// System parameters
export const EMISSION_FACTOR = 1.033; // tCO2/MWh for South African grid (Crunch Carbon grid emissions factor)
export const COAL_FACTOR = 0.0011; // kg coal per kWh
export const AVERAGE_SUN_HOURS = 4.5; // Average daily sun hours in South Africa
export const DAYS_IN_YEAR = 365;

// Note: Carbon prices are now exclusively loaded from the database
// via the dynamicCarbonPricingService. No hardcoded fallback prices remain.
