
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";

export interface SystemSetting {
  id: string;
  setting_key: string;
  setting_value: any;
  description?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
}

export interface CarbonPrices {
  [year: string]: number;
}

/**
 * Service for managing system settings
 */
class SystemSettingsService {
  private logger = logger.withContext({ service: 'SystemSettingsService' });

  /**
   * Get all system settings (admin only)
   */
  async getSystemSettings(): Promise<SystemSetting[]> {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .order('setting_key');

      if (error) throw error;
      
      this.logger.info("Retrieved system settings", { count: data?.length || 0 });
      return data || [];
    } catch (error) {
      this.logger.error("Error retrieving system settings", { error });
      throw error;
    }
  }

  /**
   * Get carbon prices from system settings
   */
  async getCarbonPrices(): Promise<CarbonPrices> {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('setting_value')
        .eq('setting_key', 'carbon_prices')
        .maybeSingle();

      if (error) {
        this.logger.error("Database error retrieving carbon prices", { error });
        throw error;
      }
      
      if (!data) {
        this.logger.warn("No carbon prices found in system settings");
        throw new Error("Carbon prices not found in database");
      }
      
      this.logger.info("Retrieved carbon prices from system settings");
      return data.setting_value as CarbonPrices;
    } catch (error) {
      this.logger.error("Error retrieving carbon prices", { error });
      throw error;
    }
  }

  /**
   * Update carbon prices (admin only)
   */
  async updateCarbonPrices(prices: CarbonPrices): Promise<void> {
    try {
      const { error } = await supabase
        .from('system_settings')
        .upsert({
          setting_key: 'carbon_prices',
          setting_value: prices,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
      
      this.logger.info("Updated carbon prices", { prices });
    } catch (error) {
      this.logger.error("Error updating carbon prices", { error });
      throw error;
    }
  }

  /**
   * Initialize carbon prices in database if they don't exist
   */
  async initializeCarbonPrices(): Promise<void> {
    try {
      // Default carbon prices that match the constants
      const defaultPrices: CarbonPrices = {
        "2024": 78.36,
        "2025": 97.34,
        "2026": 127.03,
        "2027": 143.12,
        "2028": 158.79,
        "2029": 174.88,
        "2030": 190.55
      };

      const { error } = await supabase
        .from('system_settings')
        .upsert({
          setting_key: 'carbon_prices',
          setting_value: defaultPrices,
          description: 'Carbon credit prices by year (in Rand per tCO₂e)',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
      
      this.logger.info("Initialized carbon prices in database", { defaultPrices });
    } catch (error) {
      this.logger.error("Error initializing carbon prices", { error });
      throw error;
    }
  }

  /**
   * Update a system setting (admin only)
   */
  async updateSetting(key: string, value: any, description?: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('system_settings')
        .upsert({
          setting_key: key,
          setting_value: value,
          description,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
      
      this.logger.info("Updated system setting", { key, value });
    } catch (error) {
      this.logger.error("Error updating system setting", { error, key });
      throw error;
    }
  }
}

export const systemSettingsService = new SystemSettingsService();
