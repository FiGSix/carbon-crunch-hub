
/**
 * Constants used in carbon calculations
 */

/**
 * Carbon emission factor: 1.033 kg CO₂ per kWh
 * This is the amount of CO₂ emissions avoided per kWh of renewable energy
 */
export const EMISSION_FACTOR = 1.033;

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
 * Carbon prices by year (in Rand per tCO₂)
 */
export const CARBON_PRICES: Record<string, number> = {
  "2024": 78.36,
  "2025": 93.19,
  "2026": 110.78,
  "2027": 131.64,
  "2028": 156.30,
  "2029": 185.30,
  "2030": 190.55
};
