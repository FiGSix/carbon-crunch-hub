
import { systemSettingsService } from "@/services/systemSettingsService";
import { CARBON_PRICES } from "./constants";
import { logger } from "@/lib/logger";

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
        this.cachedPrices = dynamicPrices;
        this.lastCacheTime = now;
        this.logger.info("Loaded dynamic carbon prices", { count: Object.keys(dynamicPrices).length });
        return dynamicPrices;
      }
    } catch (error) {
      this.logger.warn("Failed to load dynamic carbon prices, using constants", { error });
    }

    // Fallback to constants if dynamic loading fails
    this.logger.info("Using fallback carbon prices from constants");
    return CARBON_PRICES;
  }

  /**
   * Get carbon price for a specific year
   */
  async getCarbonPriceForYear(year: string | number): Promise<number> {
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
