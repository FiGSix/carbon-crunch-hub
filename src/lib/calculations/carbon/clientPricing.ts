
import { dynamicCarbonPricingService } from './dynamicPricing';
import { getClientSharePercentage } from './simplified';

export async function getFormattedClientSpecificCarbonPrice(year: string, portfolioKWp: number, clientShareOverride?: number): Promise<string> {
  const marketPrice = await dynamicCarbonPricingService.getCarbonPriceForYear(year);
  const clientShare = clientShareOverride ?? getClientSharePercentage(portfolioKWp);
  const clientPrice = marketPrice * (clientShare / 100);
  return `R ${clientPrice.toFixed(2)}`;
}

export async function calculateClientSpecificRevenue(year: string, carbonCredits: number, portfolioKWp: number, clientShareOverride?: number): Promise<number> {
  const marketPrice = await dynamicCarbonPricingService.getCarbonPriceForYear(year);
  const clientShare = clientShareOverride ?? getClientSharePercentage(portfolioKWp);
  return Math.round(carbonCredits * marketPrice * (clientShare / 100));
}
