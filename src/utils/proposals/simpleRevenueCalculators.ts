
/**
 * Simplified revenue calculation utilities
 */

// Simple carbon price - can be updated as needed
const CURRENT_CARBON_PRICE = 25; // AUD per tonne

/**
 * Calculate simple proposal revenue
 */
export function calculateSimpleRevenue(
  carbonCredits: number, 
  clientSharePercentage: number
): number {
  if (!carbonCredits || !clientSharePercentage) {
    return 0;
  }

  const totalRevenue = carbonCredits * CURRENT_CARBON_PRICE * (clientSharePercentage / 100);
  return Math.round(totalRevenue);
}

/**
 * Calculate simple agent commission revenue
 */
export function calculateSimpleAgentRevenue(
  carbonCredits: number, 
  agentCommissionPercentage: number
): number {
  if (!carbonCredits || !agentCommissionPercentage) {
    return 0;
  }

  const commissionRevenue = carbonCredits * CURRENT_CARBON_PRICE * (agentCommissionPercentage / 100);
  return Math.round(commissionRevenue);
}

/**
 * Get the current carbon price
 */
export function getCurrentCarbonPrice(): number {
  return CURRENT_CARBON_PRICE;
}

/**
 * Calculate total potential revenue for display
 */
export function calculateTotalRevenue(carbonCredits: number): number {
  if (!carbonCredits) return 0;
  return Math.round(carbonCredits * CURRENT_CARBON_PRICE);
}
