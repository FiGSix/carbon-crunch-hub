
/**
 * Carbon calculation constants
 */

// System parameters
export const EMISSION_FACTOR = 1.033; // tCO2/MWh for South African grid (Crunch Carbon grid emissions factor)
export const COAL_FACTOR = 0.0011; // kg coal per kWh
export const AVERAGE_SUN_HOURS = 4.5; // Average daily sun hours in South Africa
export const DAYS_IN_YEAR = 365;

// Fallback carbon prices (in Rand per tCO₂e) - used when dynamic pricing fails
// These should match the current database values
export const CARBON_PRICES: Record<string, number> = {
  "2024": 78.36,
  "2025": 97.34,
  "2026": 127.03,
  "2027": 143.12,
  "2028": 158.79,
  "2029": 174.88,
  "2030": 190.55
};
