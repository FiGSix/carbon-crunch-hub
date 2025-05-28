
/**
 * Carbon calculation constants
 */

// System parameters
export const EMISSION_FACTOR = 1.033; // tCO2/MWh for South African grid (Crunch Carbon grid emissions factor)
export const COAL_FACTOR = 0.0011; // kg coal per kWh
export const AVERAGE_SUN_HOURS = 4.5; // Average daily sun hours in South Africa
export const DAYS_IN_YEAR = 365;

// Carbon credit prices by year (Rand per tonne CO2)
// Only includes current and future years
export const CARBON_PRICES: Record<string, number> = {
  "2025": 134,
  "2026": 147,
  "2027": 162,
  "2028": 178,
  "2029": 196,
  "2030": 215
};
