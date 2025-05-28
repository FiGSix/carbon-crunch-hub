

/**
 * Constants used in carbon calculations
 */

/**
 * Carbon emission factor: 0.928 tCO₂ per MWh (standardized)
 * This is the amount of CO₂ emissions avoided per MWh of renewable energy
 */
export const EMISSION_FACTOR = 0.928;

/**
 * Coal factor: 0.33 kg of coal per kWh
 * This represents the amount of coal needed to produce 1 kWh of electricity
 */
export const COAL_FACTOR = 0.33;

/**
 * Average sun hours per day for solar calculation
 */
export const AVERAGE_SUN_HOURS = 4.5;

/**
 * Days in a standard year (non-leap year)
 */
export const DAYS_IN_YEAR = 365;

/**
 * Carbon prices by year (in Rand per tCO₂) - Updated with correct market prices
 */
export const CARBON_PRICES: Record<string, number> = {
  "2024": 78.36,
  "2025": 85.00,
  "2026": 92.00,
  "2027": 100.00,
  "2028": 108.00,
  "2029": 117.00,
  "2030": 190.55
};

