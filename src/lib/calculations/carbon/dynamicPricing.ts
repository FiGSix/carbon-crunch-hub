import { systemSettingsService } from "@/services/systemSettingsService";
import { vintageConfigService } from "@/services/vintageConfigService";
import { CARBON_PRICES } from "./constants";
import { logger } from "@/lib/logger";
import { supabase } from "@/integrations/supabase/client";

/**
 * Filter carbon prices to exclude years before the minimum vintage year
 * Uses vintage configuration to determine cutoff
 */
async function filterPricesFromMinimumVintage(prices: Record<string, number>): Promise<Record<string, number>> {
  const minimumYear = await vintageConfigService.getMinimumVintageYear();
  const filteredPrices: Record<string, number> = {};
  
  Object.entries(prices).forEach(([year, price]) => {
    const yearNum = parseInt(year);
    if (yearNum >= minimumYear) {
      filteredPrices[year] = price;
    }
  });
  
  return filteredPrices;
}

/**
 * Synchronous filter for when minimum year is already known
 */
function filterPricesFromYear(prices: Record<string, number>, minimumYear: number): Record<string, number> {
  const filteredPrices: Record<string, number> = {};
  
  Object.entries(prices).forEach(([year, price]) => {
    const yearNum = parseInt(year);
    if (yearNum >= minimumYear) {
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
   * Only includes years from minimum vintage year onwards
   */
  async getCarbonPrices(): Promise<Record<string, number>> {
    try {
      // Check if cache is still valid
      const now = Date.now();
      if (this.cachedPrices && (now - this.lastCacheTime) < this.cacheValidityMs) {
        return this.cachedPrices;
      }

      // Get minimum vintage year first
      const minimumYear = await vintageConfigService.getMinimumVintageYear();

      // Prefer the new default rate set
      let dynamicPrices: Record<string, number> | null = null;
      try {
        const { data: def } = await supabase
          .from("carbon_rate_sets")
          .select("prices")
          .eq("is_default", true)
          .maybeSingle();
        if (def?.prices && Object.keys(def.prices as object).length > 0) {
          dynamicPrices = def.prices as Record<string, number>;
        }
      } catch (e) {
        this.logger.warn("Failed to read default rate set, falling back to system_settings", { error: e });
      }

      // Fallback to legacy system_settings.carbon_prices
      if (!dynamicPrices) {
        dynamicPrices = await systemSettingsService.getCarbonPrices();
      }

      if (dynamicPrices && Object.keys(dynamicPrices).length > 0) {
        // Filter prices based on minimum vintage year
        const filteredDynamicPrices = filterPricesFromYear(dynamicPrices, minimumYear);
        this.cachedPrices = filteredDynamicPrices;
        this.lastCacheTime = now;
        this.logger.info("Loaded dynamic carbon prices (filtered from vintage year)", {
          minimumYear,
          total: Object.keys(dynamicPrices).length,
          filtered: Object.keys(filteredDynamicPrices).length,
        });
        return filteredDynamicPrices;
      }

      // Fallback to constants if dynamic loading fails (also filtered)
      const filteredConstantPrices = filterPricesFromYear(CARBON_PRICES, minimumYear);
      this.cachedPrices = filteredConstantPrices;
      this.lastCacheTime = now;
      this.logger.info("Using fallback carbon prices from constants (filtered from vintage year)", {
        minimumYear,
        fallbackPrices: filteredConstantPrices
      });
      return filteredConstantPrices;
    } catch (error) {
      this.logger.warn("Failed to load carbon prices, using current year filter", { error });
      // Ultimate fallback: use current year
      const currentYear = new Date().getFullYear();
      const filteredConstantPrices = filterPricesFromYear(CARBON_PRICES, currentYear);
      this.cachedPrices = filteredConstantPrices;
      this.lastCacheTime = Date.now();
      return filteredConstantPrices;
    }
  }

  /**
   * Get carbon price for a specific year
   * Returns 0 for years before minimum vintage year
   */
  async getCarbonPriceForYear(year: string | number): Promise<number> {
    const yearNum = typeof year === 'string' ? parseInt(year) : year;
    const minimumYear = await vintageConfigService.getMinimumVintageYear();
    
    // Return 0 for years before minimum vintage
    if (yearNum < minimumYear) {
      return 0;
    }
    
    const prices = await this.getCarbonPrices();
    const yearStr = year.toString();
    return prices[yearStr] || 0;
  }

  /**
   * Get carbon prices for a specific client. If the client has an
   * assigned carbon_rate_set_id, use those; otherwise fall back to the
   * default rate set / system settings. Result is filtered by minimum
   * vintage year, same as getCarbonPrices().
   */
  async getCarbonPricesForClient(clientId?: string | null): Promise<Record<string, number>> {
    try {
      const minimumYear = await vintageConfigService.getMinimumVintageYear();

      let overridePrices: Record<string, number> | null = null;

      if (clientId) {
        const { data: client } = await supabase
          .from("clients")
          .select("carbon_rate_set_id")
          .eq("id", clientId)
          .maybeSingle();

        const rateSetId = (client as { carbon_rate_set_id?: string | null } | null)?.carbon_rate_set_id;
        if (rateSetId) {
          const { data: set } = await supabase
            .from("carbon_rate_sets")
            .select("prices")
            .eq("id", rateSetId)
            .maybeSingle();
          if (set?.prices && Object.keys(set.prices as object).length > 0) {
            overridePrices = set.prices as Record<string, number>;
          }
        }
      }

      if (!overridePrices) {
        // Try the default rate set first, then fall back to legacy system_settings, then constants.
        const { data: def } = await supabase
          .from("carbon_rate_sets")
          .select("prices")
          .eq("is_default", true)
          .maybeSingle();
        if (def?.prices && Object.keys(def.prices as object).length > 0) {
          overridePrices = def.prices as Record<string, number>;
        }
      }

      if (!overridePrices) {
        return this.getCarbonPrices();
      }

      return filterPricesFromYear(overridePrices, minimumYear);
    } catch (error) {
      this.logger.warn("getCarbonPricesForClient failed, falling back to default", { error });
      return this.getCarbonPrices();
    }
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
