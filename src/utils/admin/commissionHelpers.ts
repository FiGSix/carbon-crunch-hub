/**
 * Helper utilities for agent commission display in Admin UI.
 *
 * Commission overrides now live on the COMPANY (companies.commission_override),
 * not on the profile. These helpers accept an optional company-level override.
 */
import { getAgentCommissionPercentage } from '@/services/calculations/carbon/pricing';
import { AGENT_COMMISSION_LOW, AGENT_COMMISSION_HIGH } from '@/services/calculations/carbon/constants';

/**
 * Get the display-friendly commission rate for a partner.
 * Company override wins; otherwise falls back to the MWp tier.
 */
export function getAgentDisplayCommission(
  companyKWp: number = 0,
  companyCommissionOverride: number | null = null
): string {
  if (companyCommissionOverride !== null && companyCommissionOverride !== undefined) {
    return `${companyCommissionOverride}%`;
  }
  return `${getAgentCommissionPercentage(companyKWp)}%`;
}

/**
 * Default tier description for tooltips/help text.
 */
export function getDefaultCommissionDescription(): string {
  return `${AGENT_COMMISSION_LOW}% for company portfolios under 15 MWp, ${AGENT_COMMISSION_HIGH}% for 15 MWp and above`;
}

/**
 * Get commission tier info for display
 */
export function getCommissionTierInfo(companyKWp: number = 0) {
  const currentRate = companyKWp < 15000 ? AGENT_COMMISSION_LOW : AGENT_COMMISSION_HIGH;
  const nextTierThreshold = 15000; // 15 MWp in kWp
  const isAtHigherTier = companyKWp >= nextTierThreshold;

  return {
    currentRate,
    nextRate: AGENT_COMMISSION_HIGH,
    nextTierThreshold,
    isAtHigherTier,
    progressToNextTier: isAtHigherTier ? 100 : (companyKWp / nextTierThreshold) * 100,
    remainingKWp: isAtHigherTier ? 0 : nextTierThreshold - companyKWp,
  };
}
