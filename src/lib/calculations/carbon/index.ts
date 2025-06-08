// Simplified carbon calculations entry point
export {
  normalizeToKWp,
  calculateAnnualEnergy,
  calculateCarbonCredits,
  calculateRevenue,
  getClientSharePercentage,
  getAgentCommissionPercentage,
  EMISSION_FACTOR,
  AVERAGE_SUN_HOURS,
  DAYS_IN_YEAR
} from './simplified';

// Keep legacy exports for backward compatibility
export { normalizeToKWp as formatSystemSizeForDisplay } from './simplified';
