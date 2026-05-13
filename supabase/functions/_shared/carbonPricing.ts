import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export type CarbonPrices = Record<string, number>;

/**
 * Fallback prices used only if system_settings.carbon_prices is missing.
 * Keep in sync with src/lib/calculations/carbon/constants.ts.
 */
const FALLBACK_PRICES: CarbonPrices = {
  "2024": 97.34,
  "2025": 97.34,
  "2026": 127.03,
  "2027": 143.12,
  "2028": 158.79,
  "2029": 174.88,
  "2030": 190.55,
};

/**
 * Loads carbon prices from system_settings (single source of truth used by the
 * frontend dynamicCarbonPricingService). Falls back to constants if unavailable.
 */
export async function getCarbonPrices(
  supabase: ReturnType<typeof createClient>
): Promise<CarbonPrices> {
  try {
    const { data, error } = await supabase
      .from("system_settings")
      .select("setting_value")
      .eq("setting_key", "carbon_prices")
      .maybeSingle();

    if (error || !data?.setting_value) {
      console.warn("[carbonPricing] Using fallback carbon prices", { error });
      return FALLBACK_PRICES;
    }
    return data.setting_value as CarbonPrices;
  } catch (e) {
    console.warn("[carbonPricing] Fetch failed, using fallback", e);
    return FALLBACK_PRICES;
  }
}

/**
 * Calculate revenue across a year range using the provided prices map.
 * sharePercent is the fraction (0-100) the recipient receives.
 */
export function calculateRevenueRange(
  prices: CarbonPrices,
  carbonCredits: number,
  sharePercent: number,
  fromYear: number,
  toYear: number
): number {
  let total = 0;
  for (let y = fromYear; y <= toYear; y++) {
    const price = prices[String(y)] ?? 0;
    total += carbonCredits * price * (sharePercent / 100);
  }
  return total;
}

/**
 * Single-year revenue helper (e.g. for short-term 2026 lens).
 */
export function calculateRevenueForYear(
  prices: CarbonPrices,
  carbonCredits: number,
  sharePercent: number,
  year: number
): number {
  const price = prices[String(year)] ?? 0;
  return carbonCredits * price * (sharePercent / 100);
}
