

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
  "2025": 97.34,
  "2026": 127.03,
  "2027": 143.12,
  "2028": 158.79,
  "2029": 174.88,
  "2030": 190.55
};
