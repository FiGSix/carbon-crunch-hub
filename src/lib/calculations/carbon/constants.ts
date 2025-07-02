/**
 * Carbon calculation constants - redirects to the unified system
 */

export { 
  DEFAULT_ANNUAL_GENERATION_FACTOR,
  DEFAULT_CARBON_FACTOR,
  DEFAULT_CLIENT_SHARE,
  AGENT_COMMISSION_LOW,
  AGENT_COMMISSION_HIGH
} from '@/services/calculations/carbon/constants';

// Function to calculate Crunch commission dynamically
export function calculateCrunchCommission(clientShare: number, agentCommission: number): number {
  return 100 - clientShare - agentCommission;
}

// Additional constants for backward compatibility  
export const EMISSION_FACTOR = 1.0334; // tCO₂/MWh (Crunch Carbon's unique grid emission factor)
export const AVERAGE_SUN_HOURS = 4.5;
export const DAYS_IN_YEAR = 365;

// Carbon prices fallback (in Rands per tonne CO₂)
export const CARBON_PRICES: Record<string, number> = {
  "2024": 78.36,
  "2025": 97.34,
  "2026": 127.03,
  "2027": 143.12,
  "2028": 158.79,
  "2029": 174.88,
  "2030": 190.55
};