/**
 * Helper utilities for agent commission calculations in Admin UI
 */
import { getAgentCommissionPercentage } from '@/services/calculations/carbon/pricing';
import { AGENT_COMMISSION_LOW, AGENT_COMMISSION_HIGH } from '@/services/calculations/carbon/constants';

/**
 * Get the display-friendly commission rate for an agent
 * Takes into account override and portfolio-based tiers
 */
export function getAgentDisplayCommission(
  portfolioKWp: number = 0,
  commissionOverride: number | null = null
): string {
  if (commissionOverride !== null && commissionOverride !== undefined) {
    return `${commissionOverride}%`;
  }
  
  // Use the actual calculation logic
  const rate = getAgentCommissionPercentage(portfolioKWp, undefined, true, commissionOverride);
  return `${rate}%`;
}

/**
 * Get the default commission rate description for tooltips/help text
 */
export function getDefaultCommissionDescription(): string {
  return `${AGENT_COMMISSION_LOW}% for portfolios under 15 MWp, ${AGENT_COMMISSION_HIGH}% for 15 MWp and above`;
}

/**
 * Get commission tier info for display
 */
export function getCommissionTierInfo(portfolioKWp: number = 0) {
  const currentRate = portfolioKWp < 15000 ? AGENT_COMMISSION_LOW : AGENT_COMMISSION_HIGH;
  const nextTierThreshold = 15000; // 15 MWp in kWp
  const isAtHigherTier = portfolioKWp >= nextTierThreshold;
  
  return {
    currentRate,
    nextRate: AGENT_COMMISSION_HIGH,
    nextTierThreshold,
    isAtHigherTier,
    progressToNextTier: isAtHigherTier ? 100 : (portfolioKWp / nextTierThreshold) * 100,
    remainingKWp: isAtHigherTier ? 0 : nextTierThreshold - portfolioKWp
  };
}
