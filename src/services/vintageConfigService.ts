import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";

export interface VintageDeadlines {
  [year: string]: string; // ISO 8601 date string
}

/**
 * Service for managing vintage configuration
 * Provides centralized access to vintage deadlines and year filtering
 */
class VintageConfigService {
  private logger = logger.withContext({ service: 'VintageConfigService' });
  private cachedDeadlines: VintageDeadlines | null = null;
  private lastCacheTime = 0;
  private cacheValidityMs = 5 * 60 * 1000; // 5 minutes

  /**
   * Get vintage deadlines from system settings
   */
  async getVintageDeadlines(): Promise<VintageDeadlines> {
    try {
      const now = Date.now();
      if (this.cachedDeadlines && (now - this.lastCacheTime) < this.cacheValidityMs) {
        return this.cachedDeadlines;
      }

      const { data, error } = await supabase
        .from('system_settings')
        .select('setting_value')
        .eq('setting_key', 'vintage_deadlines')
        .maybeSingle();

      if (error) {
        this.logger.error("Error fetching vintage deadlines", { error });
        throw error;
      }

      if (data?.setting_value) {
        this.cachedDeadlines = data.setting_value as VintageDeadlines;
        this.lastCacheTime = now;
        return this.cachedDeadlines;
      }

      // Return empty object if no deadlines configured
      return {};
    } catch (error) {
      this.logger.warn("Failed to fetch vintage deadlines", { error });
      return {};
    }
  }

  /**
   * Get the minimum vintage year that is still open for submissions
   * Uses server-side RPC to ensure consistent results across all users regardless of browser timezone
   */
  async getMinimumVintageYear(): Promise<number> {
    try {
      const { data, error } = await supabase.rpc('get_minimum_vintage_year');

      if (error) {
        this.logger.error("Error fetching minimum vintage year from RPC", { error });
        // Fallback to current year on error
        return new Date().getFullYear();
      }

      if (data !== null) {
        this.logger.info("Minimum vintage year from server", { year: data });
        return data;
      }

      // Fallback to current year if no data returned
      return new Date().getFullYear();
    } catch (error) {
      this.logger.warn("Failed to get minimum vintage year from RPC, falling back to current year", { error });
      return new Date().getFullYear();
    }
  }

  /**
   * Check if a specific vintage year is still open for submissions
   */
  async isVintageOpen(year: number): Promise<boolean> {
    const deadlines = await this.getVintageDeadlines();
    const now = new Date();

    const deadlineStr = deadlines[year.toString()];
    if (deadlineStr) {
      const deadline = new Date(deadlineStr);
      return deadline > now;
    }

    // If no deadline configured, vintage is open if year >= current year
    return year >= new Date().getFullYear();
  }

  /**
   * Get the next open vintage deadline (for countdown display)
   * Returns the earliest deadline that hasn't passed yet
   */
  async getNextVintageDeadline(): Promise<{ year: number; deadline: Date } | null> {
    const deadlines = await this.getVintageDeadlines();
    const now = new Date();

    let earliest: { year: number; deadline: Date } | null = null;

    for (const [yearStr, deadlineStr] of Object.entries(deadlines)) {
      const deadline = new Date(deadlineStr);
      if (deadline > now) {
        if (!earliest || deadline < earliest.deadline) {
          earliest = { year: parseInt(yearStr), deadline };
        }
      }
    }

    return earliest;
  }

  /**
   * Clear the cache to force reload
   */
  clearCache(): void {
    this.cachedDeadlines = null;
    this.lastCacheTime = 0;
    this.logger.info("Vintage config cache cleared");
  }
}

export const vintageConfigService = new VintageConfigService();
