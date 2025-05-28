
/**
 * Carbon calculation constants
 */

// System parameters
export const EMISSION_FACTOR = 1.033; // tCO2/MWh for South African grid (Crunch Carbon grid emissions factor)
export const COAL_FACTOR = 0.0011; // kg coal per kWh
export const AVERAGE_SUN_HOURS = 4.5; // Average daily sun hours in South Africa
export const DAYS_IN_YEAR = 365;

// Fallback carbon prices (used when dynamic pricing fails)
export const CARBON_PRICES: Record<string, number> = {
  "2025": 180,
  "2026": 185,
  "2027": 190,
  "2028": 195,
  "2029": 200,
  "2030": 205
};

// Note: Carbon prices are now dynamically loaded from the database
// via the dynamicCarbonPricingService. The above are fallback values only.
