
import { systemSettingsService } from "@/services/systemSettingsService";
import { CARBON_PRICES } from "./constants";
import { logger } from "@/lib/logger";

/**
 * Get current year for filtering past years
 */
function getCurrentYear(): number {
  return new Date().getFullYear();
}

/**
 * Filter carbon prices to exclude past years
 * 
 * @param prices - Carbon prices object
 */
function filterCurrentAndFuturePrices(prices: Record<string, number>): Record<string, number> {
  const currentYear = getCurrentYear();
  const filteredPrices: Record<string, number> = {};
  
  Object.entries(prices).forEach(([year, price]) => {
    const yearNum = parseInt(year);
    if (yearNum >= currentYear) {
      filteredPrices[year] = price;
    }
  });
  
  return filteredPrices;
}

/**
 * Dynamic carbon pricing service that loads prices from system settings
 */
class DynamicCarbonPricingService {
  private logger = logger.withContext({ service: 'DynamicCarbonPricingService' });
  private cachedPrices: Record<string, number> | null = null;
  private lastCacheTime = 0;
  private cacheValidityMs = 5 * 60 * 1000; // 5 minutes

  /**
   * Get carbon prices with fallback to constants
   * Only includes current and future years
   */
  async getCarbonPrices(): Promise<Record<string, number>> {
    try {
      // Check if cache is still valid
      const now = Date.now();
      if (this.cachedPrices && (now - this.lastCacheTime) < this.cacheValidityMs) {
        return this.cachedPrices;
      }

      // Try to load from system settings
      const dynamicPrices = await systemSettingsService.getCarbonPrices();
      
      if (dynamicPrices && Object.keys(dynamicPrices).length > 0) {
        // Filter out past years from dynamic prices
        const filteredDynamicPrices = filterCurrentAndFuturePrices(dynamicPrices);
        this.cachedPrices = filteredDynamicPrices;
        this.lastCacheTime = now;
        this.logger.info("Loaded dynamic carbon prices (filtered for current/future years)", { 
          total: Object.keys(dynamicPrices).length,
          filtered: Object.keys(filteredDynamicPrices).length
        });
        return filteredDynamicPrices;
      }
    } catch (error) {
      this.logger.warn("Failed to load dynamic carbon prices, using constants", { error });
    }

    // Fallback to constants if dynamic loading fails (also filtered)
    const filteredConstantPrices = filterCurrentAndFuturePrices(CARBON_PRICES);
    this.logger.info("Using fallback carbon prices from constants (filtered for current/future years)");
    return filteredConstantPrices;
  }

  /**
   * Get carbon price for a specific year
   * Returns 0 for past years
   */
  async getCarbonPriceForYear(year: string | number): Promise<number> {
    const yearNum = typeof year === 'string' ? parseInt(year) : year;
    
    // Return 0 for past years
    if (yearNum < getCurrentYear()) {
      return 0;
    }
    
    const prices = await this.getCarbonPrices();
    const yearStr = year.toString();
    return prices[yearStr] || 0;
  }

  /**
   * Clear the cache to force reload
   */
  clearCache(): void {
    this.cachedPrices = null;
    this.lastCacheTime = 0;
    this.logger.info("Carbon pricing cache cleared");
  }
}

export const dynamicCarbonPricingService = new DynamicCarbonPricingService();
