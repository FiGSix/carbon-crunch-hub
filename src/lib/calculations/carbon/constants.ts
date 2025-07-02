/**
 * Carbon calculation constants - redirects to the unified system
 */

export { 
  DEFAULT_ANNUAL_GENERATION_FACTOR,
  DEFAULT_CARBON_FACTOR,
  DEFAULT_CLIENT_SHARE,
  DEFAULT_AGENT_COMMISSION,
  CRUNCH_COMMISSION
} from '@/services/calculations/carbon/constants';

// Additional constants for backward compatibility
export const EMISSION_FACTOR = 0.928; // tCO₂/MWh
export const AVERAGE_SUN_HOURS = 4.5;
export const DAYS_IN_YEAR = 365;

// Carbon prices fallback
export const CARBON_PRICES: Record<string, number> = {
  "2024": 78.36,
  "2025": 97.34,
  "2026": 127.03,
  "2027": 143.12,
  "2028": 158.79,
  "2029": 174.88,
  "2030": 190.55
};